import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  RefreshCw,
  Sparkles,
  Film,
  Tv,
  Clapperboard,
  Compass,
  SlidersHorizontal,
  Flame,
  User,
} from "lucide-react";

import Navbar from "../components/layout/Navbar";
import MovieCard from "../components/movie/MovieCard";
import {
  searchMovies,
  searchActors,
  getRecommendedDiscoveries,
  getMovies,
} from "../services/movieService";
import { useLibrary } from "../hooks/useLibrary";
import "./SearchPage.css";

const GENRE_PILLS = [
  "All",
  "Action",
  "Sci-Fi",
  "Drama",
  "Comedy",
  "Horror",
  "Thriller",
  "Animation",
  "Romance",
  "Crime",
  "Fantasy",
];

const TYPE_FILTERS = [
  { id: "all", label: "All Titles", icon: Clapperboard },
  { id: "movie", label: "Movies", icon: Film },
  { id: "tv", label: "Series", icon: Tv },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState("all");
  const [activeGenre, setActiveGenre] = useState("All");

  const [searchResults, setSearchResults] = useState([]);
  const [actorResults, setActorResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false);

  const [localCatalogue, setLocalCatalogue] = useState([]);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const { watchlist, toggleWatchlist } = useLibrary();

  // Load local catalogue cache for instant 0ms searches
  useEffect(() => {
    getMovies().then((data) => {
      if (data && Array.isArray(data.movies)) {
        setLocalCatalogue(data.movies);
      }
    });
  }, []);

  // Fetch or refresh recommendations
  const loadRecommendations = useCallback(async (forcedGenre) => {
    setIsRefreshingRecs(true);
    const targetGenre = forcedGenre !== undefined ? forcedGenre : activeGenre;
    try {
      const recs = await getRecommendedDiscoveries({
        seed: Date.now() + Math.random(),
        count: 28,
        genre: targetGenre,
      });
      setRecommendations(recs);
    } catch (_) {
      // Fallback
    } finally {
      setIsRefreshingRecs(false);
    }
  }, [activeGenre]);

  // Initial recommendation load on page mount
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Focus search input on "/" keypress and clear on "Escape"
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        setSearchResults([]);
        setSearchParams({}, { replace: true });
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchParams]);

  // Execute Search (instant local match + debounced comprehensive TMDB search)
  useEffect(() => {
    const clean = query.trim();
    if (!clean) {
      setSearchResults([]);
      setActorResults([]);
      setIsSearching(false);
      setSearchError("");
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ q: clean }, { replace: true });

    // 1. Instant local matching
    const qLower = clean.toLowerCase();
    const immediateMatches = localCatalogue.filter((m) => {
      const titleMatch = (m.title || "").toLowerCase().includes(qLower);
      const genreMatch = (m.genres || [m.genre || ""]).some((g) =>
        String(typeof g === "string" ? g : g?.name || "").toLowerCase().includes(qLower)
      );
      return titleMatch || genreMatch;
    });

    if (immediateMatches.length > 0) {
      setSearchResults(immediateMatches);
    }

    // 2. Debounced multi-database TMDB/OMDB search
    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const [results, people] = await Promise.all([
          searchMovies(clean),
          searchActors(clean),
        ]);
        setActorResults(Array.isArray(people) ? people : []);
        if (Array.isArray(results) && results.length > 0) {
          // Merge deduplicated
          const seen = new Set();
          const merged = [];
          for (const item of [...results, ...immediateMatches]) {
            const id = String(item.id || item.tmdbId || "");
            if (id && !seen.has(id)) {
              seen.add(id);
              merged.push(item);
            }
          }
          setSearchResults(merged);
          setSearchError("");
        } else if (immediateMatches.length === 0) {
          setSearchResults([]);
          setSearchError(`No exact matches for "${clean}". Browse our recommendations below.`);
        }
      } catch (err) {
        if (immediateMatches.length === 0) {
          setSearchError("Search service temporarily unreachable. Showing recommendations below.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, localCatalogue, setSearchParams]);

  // Filtered search results by type and genre
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((m) => {
      const isTv = Boolean(m.mediaType === "tv" || m.isTV);
      if (activeType === "movie" && isTv) return false;
      if (activeType === "tv" && !isTv) return false;

      if (activeGenre !== "All") {
        const genres = (Array.isArray(m.genres) ? m.genres : [m.genre])
          .filter(Boolean)
          .map((g) => String(typeof g === "string" ? g : g?.name || "").toLowerCase());
        const target = activeGenre.toLowerCase();
        if (!genres.some((g) => g.includes(target) || target.includes(g))) {
          return false;
        }
      }
      return true;
    });
  }, [searchResults, activeType, activeGenre]);

  // Filtered recommendations by type
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((m) => {
      const isTv = Boolean(m.mediaType === "tv" || m.isTV);
      if (activeType === "movie" && isTv) return false;
      if (activeType === "tv" && !isTv) return false;
      return true;
    });
  }, [recommendations, activeType]);

  const handleSelectMovie = (movie) => {
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    navigate(`/movie/${movie.id}${isTv ? "?type=tv" : ""}`, {
      state: { movie, mediaType: isTv ? "tv" : "movie", isTV: isTv },
    });
  };

  const handlePlayMovie = (movie) => {
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    navigate(`/movie/${movie.id}?play=true${isTv ? "&type=tv&season=1&episode=1" : ""}`, {
      state: { movie, mediaType: isTv ? "tv" : "movie", isTV: isTv },
    });
  };

  const handleGenrePillClick = (genre) => {
    setActiveGenre(genre);
    if (!query.trim()) {
      loadRecommendations(genre);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchParams({}, { replace: true });
    searchInputRef.current?.focus();
  };

  return (
    <div className="search-page-root">
      <Navbar />

      <main className="search-page-container">
        {/* HERO SEARCH SECTION */}
        <section className="search-hero-section">
          <div className="search-hero-eyebrow">
            <Sparkles size={13} className="eyebrow-sparkle" />
            <span>DISCOVER CINEMA & TV</span>
          </div>

          <h1 className="search-hero-heading">
            Find anything. Stream anywhere.
          </h1>

          <p className="search-hero-subheading">
            Search hundreds of thousands of films, series, anime, and directors with zero friction.
          </p>

          {/* LIQUID GLASS SEARCH BAR */}
          <div className="search-input-shell">
            <div className="search-icon-box">
              <Search size={22} className="search-lens-icon" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              className="search-main-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV shows, cast, anime, genres..."
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />

            {query ? (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={18} />
              </button>
            ) : (
              <div className="search-shortcut-hint" title="Press / anywhere to focus">
                <span className="shortcut-key">/</span>
              </div>
            )}
          </div>

          {/* FILTER TOOLBAR: TYPE TOGGLE & GENRE PILLS */}
          <div className="search-controls-toolbar">
            {/* Media Type Filter */}
            <div className="search-type-toggle">
              {TYPE_FILTERS.map((type) => {
                const Icon = type.icon;
                const isActive = activeType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    className={`search-type-pill ${isActive ? "active" : ""}`}
                    onClick={() => setActiveType(type.id)}
                  >
                    <Icon size={14} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Genre Pills Slider */}
            <div className="search-genre-pills-row">
              {GENRE_PILLS.map((genre) => {
                const isActive = activeGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    className={`search-genre-pill ${isActive ? "active" : ""}`}
                    onClick={() => handleGenrePillClick(genre)}
                  >
                    {genre === "All" && <Compass size={12} />}
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* SEARCH RESULTS SECTION (If Query is Active) */}
        {query.trim().length > 0 && (
          <section className="search-results-section">
            <div className="search-section-header">
              <div className="search-section-title-wrap">
                <h2 className="search-section-title">
                  Results for <span className="highlight-query">“{query.trim()}”</span>
                </h2>
                <span className="search-results-badge">
                  {isSearching ? (
                    <span className="searching-indicator">
                      <RefreshCw size={12} className="spin-animate" /> Searching worldwide...
                    </span>
                  ) : (
                    `${filteredSearchResults.length} ${filteredSearchResults.length === 1 ? "title" : "titles"} found`
                  )}
                </span>
              </div>
            </div>

            {actorResults.length > 0 && (
              <div className="search-actors-block">
                <h3 className="search-actors-heading">
                  <User size={15} />
                  <span>Actors &amp; Creators</span>
                </h3>
                <div className="search-actors-row">
                  {actorResults.map((person) => (
                    <button
                      key={`person-${person.id}`}
                      type="button"
                      className="search-actor-pill glass-card"
                      onClick={() =>
                        navigate(`/actor/${person.id}`, {
                          state: {
                            actor: person,
                            from: `/search?q=${encodeURIComponent(query.trim())}`,
                          },
                        })
                      }
                    >
                      <img
                        src={person.profile}
                        alt={person.name}
                        className="search-actor-avatar"
                        loading="lazy"
                      />
                      <div className="search-actor-meta">
                        <span className="search-actor-name">{person.name}</span>
                        <span className="search-actor-dept">
                          {person.knownFor?.length > 0 ? person.knownFor[0] : person.department}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredSearchResults.length > 0 ? (
              <div className="search-movies-grid">
                {filteredSearchResults.map((movie) => (
                  <MovieCard
                    key={`res-${movie.id || movie.tmdbId}`}
                    movie={movie}
                    onSelect={handleSelectMovie}
                    onPlay={handlePlayMovie}
                    isSaved={watchlist.some((s) => String(s.id || s.tmdbId) === String(movie.id || movie.tmdbId))}
                    onToggleWatchlist={toggleWatchlist}
                  />
                ))}
              </div>
            ) : !isSearching ? (
              <div className="search-empty-card glass-panel">
                <Film size={40} className="empty-icon" />
                <h3>No exact titles found</h3>
                <p>{searchError || `We couldn't find a title matching "${query}". Try a different spelling or explore our fresh recommendations below.`}</p>
                <button
                  type="button"
                  className="search-reset-btn"
                  onClick={handleClearSearch}
                >
                  Clear search query
                </button>
              </div>
            ) : null}
          </section>
        )}

        {/* DYNAMIC AUTO-REFRESHING RECOMMENDATIONS SECTION */}
        <section className="search-recommendations-section">
          <div className="search-section-header">
            <div className="search-section-title-wrap">
              <div className="section-eyebrow-tag">
                <Flame size={13} />
                <span>FRESH CURATION</span>
              </div>
              <h2 className="search-section-title">
                {activeGenre !== "All" ? `Trending in ${activeGenre}` : "Recommended For You"}
              </h2>
              <span className="search-results-badge">
                Auto-shuffles on every visit or refresh
              </span>
            </div>

            {/* Refresh / Shuffle Button with Spinning Animation */}
            <button
              type="button"
              className={`search-shuffle-button ${isRefreshingRecs ? "is-refreshing" : ""}`}
              onClick={() => loadRecommendations()}
              disabled={isRefreshingRecs}
              title="Shuffle recommendations"
            >
              <RefreshCw size={15} className={isRefreshingRecs ? "spin-animate" : ""} />
              <span>Shuffle Recommendations</span>
            </button>
          </div>

          {/* Recommendations Grid */}
          <div className="search-movies-grid">
            {filteredRecommendations.map((movie) => (
              <MovieCard
                key={`rec-${movie.id || movie.tmdbId}`}
                movie={movie}
                onSelect={handleSelectMovie}
                onPlay={handlePlayMovie}
                isSaved={watchlist.some((s) => String(s.id || s.tmdbId) === String(movie.id || movie.tmdbId))}
                onToggleWatchlist={toggleWatchlist}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
