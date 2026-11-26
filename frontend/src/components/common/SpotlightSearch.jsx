import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, Film, Tv, ArrowRight, Star } from "lucide-react";
import { searchMovies } from "../../services/movieService";

function SpotlightSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !isTyping && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchMovies(q)
        .then((items) => setResults((items || []).slice(0, 8)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 240);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!isOpen) return null;

  const openTitle = (item) => {
    setIsOpen(false);
    const isTv = Boolean(item.mediaType === "tv" || item.isTV);
    navigate(`/movie/${item.id}${isTv ? "?type=tv" : ""}`, {
      state: { movie: item, mediaType: isTv ? "tv" : "movie", isTV: isTv },
    });
  };

  return (
    <div
      className="cv-spotlight-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Spotlight Search"
    >
      <div className="cv-spotlight-modal">
        <div className="cv-spotlight-input-row">
          {loading ? <Loader2 size={18} className="spinning-loader" /> : <Search size={18} />}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                setIsOpen(false);
                navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              }
            }}
            placeholder="Search movies, series, anime... (Press Enter for full results)"
            aria-label="Quick search"
          />
          <kbd className="cv-spotlight-kbd">ESC</kbd>
          <button
            type="button"
            className="cv-spotlight-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close spotlight search"
          >
            <X size={16} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="cv-spotlight-results">
            {results.map((item) => {
              const isTv = Boolean(item.mediaType === "tv" || item.isTV);
              return (
                <button
                  key={`${item.id}-${isTv ? "tv" : "mv"}`}
                  type="button"
                  className="cv-spotlight-item"
                  onClick={() => openTitle(item)}
                >
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="cv-spotlight-thumb"
                    loading="lazy"
                  />
                  <div className="cv-spotlight-item-info">
                    <span className="cv-spotlight-item-title">{item.title}</span>
                    <span className="cv-spotlight-item-meta">
                      {isTv ? <Tv size={11} /> : <Film size={11} />}
                      <span>{isTv ? "Series" : "Movie"}</span>
                      {item.year && <span>· {item.year}</span>}
                      {item.rating && (
                        <span className="cv-spotlight-rating">
                          <Star size={11} fill="currentColor" />
                          {item.rating}
                        </span>
                      )}
                    </span>
                  </div>
                  <ArrowRight size={15} className="cv-spotlight-arrow" />
                </button>
              );
            })}
          </div>
        )}

        {!query.trim() && (
          <div className="cv-spotlight-hint">
            <span>Tip: Press <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd> anywhere to search</span>
            <button
              type="button"
              className="cv-spotlight-full-btn"
              onClick={() => {
                setIsOpen(false);
                navigate("/search");
              }}
            >
              Open Full Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpotlightSearch;
