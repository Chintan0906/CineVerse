import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  X,
  Play,
  Star,
  RotateCcw,
  MessageSquareText,
  Film,
  Tv,
  Loader2,
} from "lucide-react";
import "./CineBotWidget.css";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalhost ? "http://localhost:3000/api" : "/api");

const STARTER_PROMPTS = [
  "Top 10 horror movies",
  "Movies like Interstellar",
  "Best anime series",
  "Trending movies",
];

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "bot",
  text: "Ask me for top lists, genres, mood picks, or info about any movie or series. Click any card I suggest to view details or stream right away.",
  movies: [],
};

export default function CineBotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isHiddenByOverlay, setIsHiddenByOverlay] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const sessionIdRef = useRef(
    `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  );
  const endOfChatRef = useRef(null);
  const inputRef = useRef(null);

  // Hide floating launcher when full-screen player or trailer modal is open
  useEffect(() => {
    const checkOverlay = () => {
      const hasBlockingOverlay = Boolean(
        document.querySelector(".player-overlay, .trailer-modal, .spotlight-overlay")
      );
      setIsHiddenByOverlay(hasBlockingOverlay);
    };
    checkOverlay();
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      endOfChatRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 140);
    }
  }, [isOpen, messages.length, isSending]);

  const sendMessage = async (rawText) => {
    const text = String(rawText ?? input).trim();
    if (!text || isSending) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      movies: [],
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          history: historyPayload,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error("Chat request failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: data.reply || "Here are some picks for you:",
          movies: Array.isArray(data.movies) ? data.movies : [],
        },
      ]);
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: "I couldn't reach CineBot right now. Please try again in a moment.",
          movies: [],
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenMovie = (movie, autoPlay = false) => {
    if (!movie?.id) return;
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    setIsOpen(false);
    const url = autoPlay
      ? `/movie/${movie.id}?play=true${isTv ? "&type=tv&season=1&episode=1" : ""}`
      : `/movie/${movie.id}${isTv ? "?type=tv" : ""}`;
    navigate(url, {
      state: { movie, mediaType: isTv ? "tv" : "movie", isTV: isTv },
    });
  };

  if (isHiddenByOverlay) return null;

  return (
    <div className="cinebot-root" data-lenis-prevent>
      {isOpen && (
        <section
          className="cinebot-drawer"
          role="dialog"
          aria-label="CineBot Movie Assistant"
        >
          <header className="cinebot-header">
            <div className="cinebot-header-title">
              <span className="cinebot-avatar">
                <Sparkles size={15} />
              </span>
              <div>
                <h3>CineBot AI</h3>
                <span>Click any movie to stream</span>
              </div>
            </div>
            <div className="cinebot-header-actions">
              <button
                type="button"
                className="cinebot-icon-btn"
                onClick={() => setMessages([INITIAL_MESSAGE])}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="cinebot-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close CineBot"
                aria-label="Close CineBot"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="cinebot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`cinebot-msg-group ${msg.role}`}>
                <div className={`cinebot-bubble ${msg.role}`}>
                  <p>{msg.text}</p>
                </div>

                {Array.isArray(msg.movies) && msg.movies.length > 0 && (
                  <div className="cinebot-movies-list">
                    {msg.movies.map((m) => {
                      const isTv = Boolean(m.mediaType === "tv" || m.isTV);
                      return (
                        <div
                          key={`${msg.id}-${m.id}`}
                          className="cinebot-movie-card"
                          onClick={() => handleOpenMovie(m, false)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleOpenMovie(m, false);
                            }
                          }}
                        >
                          {m.poster ? (
                            <img
                              src={m.poster}
                              alt={m.title}
                              className="cinebot-movie-poster"
                              loading="lazy"
                            />
                          ) : (
                            <div className="cinebot-movie-poster fallback">
                              {isTv ? <Tv size={18} /> : <Film size={18} />}
                            </div>
                          )}

                          <div className="cinebot-movie-info">
                            <h4>{m.title}</h4>
                            <div className="cinebot-movie-meta">
                              {m.year && <span>{m.year}</span>}
                              {m.rating && (
                                <span className="cinebot-rating">
                                  <Star size={11} fill="currentColor" />
                                  {m.rating}
                                </span>
                              )}
                              <span className="cinebot-type-tag">
                                {isTv ? "Series" : "Movie"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="cinebot-stream-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMovie(m, true);
                            }}
                            aria-label={`Stream ${m.title}`}
                            title={`Stream ${m.title}`}
                          >
                            <Play size={13} fill="currentColor" />
                            <span>Stream</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {messages.length === 1 && !isSending && (
              <div className="cinebot-starter-chips">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="cinebot-chip"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {isSending && (
              <div className="cinebot-msg-group bot">
                <div className="cinebot-bubble bot typing">
                  <Loader2 size={14} className="cinebot-spin" />
                  <span>Finding the best matches...</span>
                </div>
              </div>
            )}

            <div ref={endOfChatRef} />
          </div>

          <form
            className="cinebot-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for top 10 horror, movies like Dune..."
              aria-label="Ask CineBot"
              disabled={isSending}
            />
            <button
              type="submit"
              className="cinebot-send-btn"
              disabled={!input.trim() || isSending}
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`cinebot-launcher ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close CineBot" : "Ask CineBot for movie recommendations"}
        title="Ask CineBot"
      >
        {isOpen ? <X size={18} /> : <MessageSquareText size={18} />}
        <span>{isOpen ? "Close" : "Ask CineBot"}</span>
      </button>
    </div>
  );
}
