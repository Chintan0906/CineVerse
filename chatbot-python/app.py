import json
import os
import re
from concurrent.futures import ThreadPoolExecutor

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

TMDB_PRIMARY = "https://api.tmdb.org/3"
TMDB_FALLBACK = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

SYSTEM_PROMPT = """You are CineBot, an expert AI movie, TV series, and anime concierge for CineVerse.
Respond ONLY with valid raw JSON (no markdown fences, no extra prose outside JSON) matching ONE of these three schemas:

1. For movie/series/anime recommendations or top-N lists (e.g. "top 10 horror movies", "top 10 anime series", "movies like Inception"):
{
  "type": "movies",
  "movies": [
    { "name": "Exact Title", "genre": "Primary Genre", "reason": "Short 1-sentence reason" }
  ]
}
(Include the exact number of items requested, e.g. 10 for "top 10", otherwise 6-8.)

2. When the user asks about ONE specific movie, series, or anime (e.g. "tell me about Avengers Endgame", "what is Dark about"):
{
  "type": "details",
  "title": "Exact Title",
  "year": "Release Year",
  "genre": "Genres",
  "summary": "2-3 sentence engaging summary",
  "cast": ["Actor 1", "Actor 2", "Actor 3", "Actor 4"],
  "director": "Director or Creator Name"
}

3. For greetings or general non-title questions:
{
  "type": "text",
  "message": "Friendly concise response"
}"""


def collect_keys(base_name: str) -> list[str]:
    keys: list[str] = []
    multi = os.getenv(f"{base_name}S", "")
    if multi:
        for k in multi.split(","):
            k = k.strip()
            if k and k not in keys:
                keys.append(k)
    for suffix in ("", "_1", "_2", "_3", "_4", "_5"):
        val = os.getenv(f"{base_name}{suffix}", "").strip()
        if val and val not in keys:
            keys.append(val)
    return keys


def parse_json_payload(raw_text: str):
    if not raw_text:
        return None
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    return json.loads(cleaned)


def tmdb_fetch(path: str, params: dict | None = None):
    api_key = os.getenv("TMDB_API_KEY", "").strip()
    if not api_key:
        return None
    query = {"api_key": api_key, "language": "en-US", **(params or {})}
    for base in (TMDB_PRIMARY, TMDB_FALLBACK):
        try:
            res = requests.get(f"{base}/{path}", params=query, timeout=5.5)
            if res.ok:
                return res.json()
        except requests.RequestException:
            continue
    return None


def normalize_card(item: dict, forced_type: str | None = None):
    if not item or not item.get("id"):
        return None
    media_type = forced_type or (
        "tv" if item.get("media_type") == "tv" or (not item.get("title") and item.get("name")) else "movie"
    )
    if media_type == "person":
        return None
    date = item.get("release_date") or item.get("first_air_date") or ""
    vote = item.get("vote_average")
    return {
        "id": str(item["id"]),
        "tmdbId": item["id"],
        "title": item.get("title") or item.get("name") or "Untitled",
        "year": date[:4] if date else "",
        "rating": f"{float(vote):.1f}" if vote else "",
        "overview": item.get("overview") or "",
        "poster": f"{TMDB_IMAGE_BASE}/w342{item['poster_path']}" if item.get("poster_path") else "",
        "backdrop": f"{TMDB_IMAGE_BASE}/w780{item['backdrop_path']}" if item.get("backdrop_path") else "",
        "mediaType": media_type,
        "isTV": media_type == "tv",
    }


def resolve_titles_to_movies(entries: list) -> list[dict]:
    titles: list[str] = []
    for entry in entries[:10]:
        if isinstance(entry, str):
            t = entry.strip()
        elif isinstance(entry, dict):
            t = str(entry.get("name") or entry.get("title") or "").strip()
        else:
            t = ""
        if t:
            titles.append(t)

    def lookup(title: str):
        data = tmdb_fetch("search/multi", {"query": title, "include_adult": "false"})
        for r in data.get("results", []) if data else []:
            if r.get("media_type") in ("movie", "tv") and r.get("poster_path"):
                return normalize_card(r)
        return None

    results: list[dict] = []
    seen: set[str] = set()
    with ThreadPoolExecutor(max_workers=5) as pool:
        for card in pool.map(lookup, titles):
            if card and card["id"] not in seen:
                seen.add(card["id"])
                results.append(card)
    return results


def format_structured_reply(inner: dict, source: str):
    if not isinstance(inner, dict):
        return None
    kind = inner.get("type")

    if kind == "details" and inner.get("title"):
        meta = " · ".join(p for p in [inner.get("year"), inner.get("genre")] if p)
        cast = inner.get("cast")
        cast_line = f"Cast: {', '.join(cast)}" if isinstance(cast, list) and cast else None
        dir_line = f"Director: {inner['director']}" if inner.get("director") else None
        parts = [
            f"{inner['title']}{f' ({meta})' if meta else ''}",
            inner.get("summary") or "",
            "\n".join(p for p in [dir_line, cast_line] if p),
        ]
        movies = resolve_titles_to_movies([inner["title"]])
        return {
            "reply": "\n\n".join(p for p in parts if p),
            "movies": movies[:1],
            "source": source,
        }

    if kind == "movies" and isinstance(inner.get("movies"), list):
        items = inner["movies"]
        lines = []
        for idx, m in enumerate(items, start=1):
            name = (m.get("name") or m.get("title") or "").strip() if isinstance(m, dict) else str(m)
            reason = f" — {m['reason']}" if isinstance(m, dict) and m.get("reason") else ""
            if name:
                lines.append(f"{idx}. {name}{reason}")
        reply_text = (
            "Here are my picks — click any card to stream:\n\n" + "\n".join(lines)
            if lines
            else "Here are my recommendations:"
        )
        return {
            "reply": reply_text,
            "movies": resolve_titles_to_movies(items),
            "source": source,
        }

    if kind == "text" and inner.get("message"):
        return {
            "reply": str(inner["message"]).strip(),
            "movies": [],
            "source": source,
        }

    return None


def ask_groq(message: str, history: list[dict]):
    keys = collect_keys("GROQ_API_KEY")
    if not keys:
        return None
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-6:]:
        messages.append(
            {"role": "user" if h.get("role") == "user" else "assistant", "content": str(h.get("text", ""))}
        )
    messages.append({"role": "user", "content": message})

    for key in keys:
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.4,
                    "response_format": {"type": "json_object"},
                },
                timeout=11,
            )
            if not res.ok:
                continue
            raw = res.json()["choices"][0]["message"]["content"]
            parsed = parse_json_payload(raw)
            formatted = format_structured_reply(parsed, "python-groq")
            if formatted:
                return formatted
        except Exception:
            continue
    return None


def ask_gemini(message: str, history: list[dict]):
    keys = collect_keys("GEMINI_API_KEY")
    if not keys:
        return None
    hist_lines = "\n".join(
        f"{'User' if h.get('role') == 'user' else 'CineBot'}: {h.get('text', '')}" for h in history[-6:]
    )
    prompt = f"{SYSTEM_PROMPT}\n\n{f'Recent conversation:{chr(10)}{hist_lines}{chr(10)}{chr(10)}' if hist_lines else ''}User: {message}"

    for key in keys:
        for model in ("gemini-2.5-flash", "gemini-2.0-flash"):
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                res = requests.post(
                    url,
                    params={"key": key},
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json"},
                    },
                    timeout=11,
                )
                if not res.ok:
                    continue
                raw = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = parse_json_payload(raw)
                formatted = format_structured_reply(parsed, "python-gemini")
                if formatted:
                    return formatted
            except Exception:
                continue
    return None


@app.get("/health")
def health():
    return jsonify({"success": True, "service": "cineverse-python-chatbot"})


@app.post("/chat")
@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    message = str(body.get("message") or "").strip()
    history = body.get("history") if isinstance(body.get("history"), list) else []

    if not message:
        return jsonify({"success": False, "message": "Message is required."}), 400

    for provider in (ask_groq, ask_gemini):
        result = provider(message, history)
        if result:
            return jsonify({"success": True, **result})

    # Fallback direct TMDB search if all AI keys fail
    data = tmdb_fetch("search/multi", {"query": message, "include_adult": "false"})
    cards = []
    for r in data.get("results", []) if data else []:
        if r.get("media_type") in ("movie", "tv") and r.get("poster_path"):
            card = normalize_card(r)
            if card:
                cards.append(card)
        if len(cards) >= 8:
            break

    return jsonify(
        {
            "success": True,
            "reply": (
                f'Here is what I found for "{message}":'
                if cards
                else "I couldn't reach the AI models right now. Please try another movie or genre query."
            ),
            "movies": cards,
            "source": "python-tmdb-fallback",
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
