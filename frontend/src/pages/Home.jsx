import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Plus,
  Check,
  Search,
  X,
  Sparkles,
  Clock3,
  Star,
  Film,
  ChevronRight,
  Info,
  Loader2,
} from "lucide-react";

import Navbar from "../components/layout/Navbar";
import MovieRow from "../components/movie/MovieRow";
import MovieCard from "../components/movie/MovieCard";
import HeroSlideshow from "../components/hero/HeroSlideshow";
import VidLinkPlayer from "../components/player/VidLinkPlayer";
import StreamRecommendations from "../components/player/StreamRecommendations";
import CineVerseLogo, { CineVerseEmblem } from "../components/common/CineVerseLogo";
import { useLibrary } from "../hooks/useLibrary";
import { useMovies } from "../hooks/useMovies";
import { searchMovies, getTVShowById, getTVSeasonEpisodes, getMoviesByGenre } from "../services/movieService";
import "../components/hero/HeroSlideshow.css";

function Home() {
  const navigate = useNavigate();
  const {
    watchlist,
    history,
    toggleWatchlist: updateWatchlist,
    recordPlay,
    saveProgress,
    clearHistory,
  } = useLibrary();

  // Fetch the full movie and web-series catalogue for the home page.
  const {
    movies: apiMovies,
    categories: apiCategories,
    featuredMovies: apiFeatured,
    loading,
    error,
  } = useMovies();

  // Application state
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeTab, setActiveTab] = useState("Home");
  const [playerMovie, setPlayerMovie] = useState(null);
  const [playerSeasons, setPlayerSeasons] = useState([]);
  const [playerEpisodes, setPlayerEpisodes] = useState([]);
  const [playerSeason, setPlayerSeason] = useState(1);
  const [playerEpisode, setPlayerEpisode] = useState(1);
  const [heroIndex, setHeroIndex] = useState(0);
  const [pendingSection, setPendingSection] = useState("");

  // Worldwide live search state
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [genreResults, setGenreResults] = useState([]);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);

  useEffect(() => {
    if (!pendingSection || !["Home", "Watchlist"].includes(activeTab)) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = pendingSection === "trending-now"
        ? document.getElementById("trending-now") ||
          document.getElementById("trending-movies") ||
          document.getElementById("trending-series")
        : document.getElementById(pendingSection);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingSection("");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingSection, activeTab]);

  // Helper to normalize any movie object
  const normalize = (movie) => {
    if (!movie) return null;
    const genres =
      Array.isArray(movie.genres) && movie.genres.length > 0
        ? movie.genres
        : Array.isArray(movie.genre)
        ? movie.genre
        : [movie.genre || "Cinema"];

    return {
      ...movie,
      genre: genres[0] || "Cinema",
      genres,
      tags: movie.tags || genres.map((g) => g.toLowerCase()),
      trending: movie.trending ?? (parseFloat(movie.rating) >= 7.8),
      featured: movie.featured ?? false,
    };
  };

  // Master list of all movies normalized
  const movies = useMemo(() => {
    return apiMovies.map(normalize).filter(Boolean);
  }, [apiMovies]);

  function toggleWatchlist(mediaOrId) {
    const item = typeof mediaOrId === "object"
      ? mediaOrId
      : movies.find((movie) => String(movie.id) === String(mediaOrId)) || mediaOrId;
    updateWatchlist(item);
  }

  const isSaved = (mediaId) => watchlist.some(
    (item) => String(typeof item === "object" ? item.id : item) === String(mediaId)
  );

  // Featured movies for the hero billboard
  const featuredList = useMemo(() => {
    if (apiFeatured && apiFeatured.length > 0) {
      return apiFeatured.map(normalize).filter(Boolean);
    }
    const filtered = movies.filter((m) => m.featured);
    return filtered.length > 0 ? filtered : movies.slice(0, 5);
  }, [apiFeatured, movies]);

  // Active featured movie on the billboard
  const featuredMovie = featuredList[heroIndex] || featuredList[0] || movies[0] || null;

  // Curated Netflix categories
  const categories = useMemo(() => {
    if (apiCategories && apiCategories.length > 0) {
      return apiCategories.map((cat) => ({
        ...cat,
        movies: cat.movies.map(normalize).filter(Boolean),
      }));
    }

    return [
      {
        id: "top-10",
        title: "Top 10 Movies Today",
        subtitle: "The most-watched titles right now on CineVerse",
        isTop10: true,
        movies: movies.slice(0, 10),
      },
      {
        id: "trending-now",
        title: "Trending Now",
        subtitle: "Everyone is watching these titles",
        movies: movies.filter((m) => m.trending),
      },
      {
        id: "popular-cineverse",
        title: "Popular on CineVerse",
        subtitle: "Loved by audiences worldwide",
        movies: movies.slice(0, 20),
      },
      {
        id: "action-thrillers",
        title: "Action & High-Octane Thrillers",
        subtitle: "Suspense, danger, and relentless action",
        movies: movies.filter((m) =>
          m.genres.some((g) => ["Action", "Adventure", "Thriller"].includes(g))
        ),
      },
      {
        id: "scifi-beyond",
        title: "Sci-Fi & Cosmic Worlds",
        subtitle: "Venture beyond the known universe",
        movies: movies.filter((m) =>
          m.genres.some((g) => ["Sci-Fi", "Fantasy"].includes(g))
        ),
      },
      {
        id: "critically-acclaimed",
        title: "Critically Acclaimed Masterpieces",
        subtitle: "Award winners and fan favourites",
        movies: [...movies].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)),
      },
      {
        id: "dramas-stories",
        title: "Emotional Dramas & Stories",
        subtitle: "Compelling narratives and deep emotions",
        movies: movies.filter((m) => m.genres.includes("Drama")),
      },
    ];
  }, [apiCategories, movies]);

  // Available genre filter chips
  const genres = useMemo(() => {
    const allGenres = movies.flatMap((movie) => movie.genres);
    return [
      "All",
      "Action",
      "Sci-Fi",
      "Drama",
      "Comedy",
      "Horror",
      "Animation",
      ...new Set(
        allGenres.filter(
          (g) => !["Action", "Sci-Fi", "Drama", "Comedy", "Horror", "Animation"].includes(g)
        )
      ),
    ];
  }, [movies]);

  // Real-time worldwide debounced search across all movies ever made via TMDB
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchMovies(query);
        setGlobalSearchResults(results.map(normalize).filter(Boolean));
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Live TMDB genre discovery across worldwide movies & series
  useEffect(() => {
    if (activeGenre === "All") {
      setGenreResults([]);
      setIsLoadingGenre(false);
      return undefined;
    }

    let active = true;
    setIsLoadingGenre(true);

    getMoviesByGenre(activeGenre)
      .then((data) => {
        if (!active) return;
        if (data && data.length > 0) {
          setGenreResults(data.map(normalize).filter(Boolean));
        }
      })
      .catch((err) => {
        console.error("Genre fetch error:", err);
      })
      .finally(() => {
        if (active) setIsLoadingGenre(false);
      });

    return () => {
      active = false;
    };
  }, [activeGenre]);

  // Local filtering when a genre chip is clicked + expanded TMDB genre results
  const genreFilteredMovies = useMemo(() => {
    if (activeGenre === "All") return movies;
    if (genreResults.length > 0) return genreResults;
    return movies.filter((movie) =>
      (movie.genres || []).some((g) => g.toLowerCase() === activeGenre.toLowerCase())
    );
  }, [movies, activeGenre, genreResults]);

  // Display results when searching or filtering
  const displayedSearchResults = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      if (globalSearchResults.length > 0) return globalSearchResults;
      // Fallback to local search if no global results yet
      const query = searchQuery.trim().toLowerCase();
      return movies.filter((m) =>
        m.title.toLowerCase().includes(query) ||
        m.genres.some((g) => g.toLowerCase().includes(query))
      );
    }
    return genreFilteredMovies;
  }, [searchQuery, globalSearchResults, movies, genreFilteredMovies]);

  // Watchlist movies
  const watchlistMovies = watchlist
    .map((saved) => {
      const savedId = typeof saved === "object" ? saved.id : saved;
      return movies.find((movie) => String(movie.id) === String(savedId)) || saved;
    })
    .filter((movie) => movie?.title && movie.title !== "Saved title");
  const continueWatchingMovies = history
    .filter((item) => !item.completed)
    .slice(0, 12);
  const streamRecommendations = playerMovie
    ? movies
        .filter((movie) => String(movie.id) !== String(playerMovie.id))
        .map((movie) => ({
          movie,
          score: (movie.genres || []).filter((genre) =>
            (playerMovie.genres || []).includes(genre)
          ).length,
        }))
        .sort((a, b) => b.score - a.score || Number(b.movie.rating || 0) - Number(a.movie.rating || 0))
        .map(({ movie }) => movie)
        .slice(0, 6)
    : [];

  // Scroll to a section
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Open the video player
  function handlePlay(movie) {
    setSelectedMovie(null);
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    const initialSeason = Number(movie.season || 1);
    const initialEpisode = Number(movie.episode || 1);

    setPlayerSeason(initialSeason);
    setPlayerEpisode(initialEpisode);
    setPlayerSeasons(movie.seasons || []);
    setPlayerEpisodes(movie.episodes || []);

    const playMedia = {
      ...movie,
      season: initialSeason,
      episode: initialEpisode,
      isTV: isTv,
      mediaType: isTv ? "tv" : "movie",
    };
    recordPlay(playMedia, { season: initialSeason, episode: initialEpisode });
    setPlayerMovie(playMedia);
  }

  // Load TV show seasons and episodes if playerMovie is TV series
  useEffect(() => {
    if (!playerMovie) return undefined;
    const isTv = Boolean(playerMovie.mediaType === "tv" || playerMovie.isTV);
    if (!isTv) {
      setPlayerSeasons([]);
      setPlayerEpisodes([]);
      return undefined;
    }

    let active = true;
    getTVShowById(playerMovie.id)
      .then((data) => {
        if (!active) return;
        const validSeasons = (data?.seasons || []).filter((s) => s.season_number >= 0);
        if (validSeasons.length > 0) {
          setPlayerSeasons(validSeasons);
        }
      })
      .catch(() => {});

    getTVSeasonEpisodes(playerMovie.id, playerSeason)
      .then((eps) => {
        if (!active) return;
        if (eps && eps.length > 0) {
          setPlayerEpisodes(eps);
        } else {
          setPlayerEpisodes(Array.from({ length: 10 }, (_, i) => ({
            episodeNumber: i + 1,
            name: `Episode ${i + 1}`,
          })));
        }
      })
      .catch(() => {
        if (!active) return;
        setPlayerEpisodes(Array.from({ length: 10 }, (_, i) => ({
          episodeNumber: i + 1,
          name: `Episode ${i + 1}`,
        })));
      });

    return () => {
      active = false;
    };
  }, [playerMovie?.id, playerMovie?.mediaType, playerMovie?.isTV, playerSeason]);

  const handlePlayerProgress = useCallback((media, currentTime, duration, episode) => {
    saveProgress(media, currentTime, duration, episode);
  }, [saveProgress]);

  function showHistory() {
    setActiveTab("History");
    setActiveGenre("All");
    setSearchQuery("");
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showHome() {
    setActiveTab("Home");
    setActiveGenre("All");
    setSearchQuery("");
    setSearchOpen(false);
    setPendingSection("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showHomeSection(sectionId) {
    setActiveTab("Home");
    setActiveGenre("All");
    setSearchQuery("");
    setSearchOpen(false);
    setPendingSection(sectionId);
  }

  // Handle Escape key
  function handleModalKeyDown(event) {
    if (event.key === "Escape") {
      setSelectedMovie(null);
      setPlayerMovie(null);
      setSearchOpen(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="app-shell loading-screen">
        <CineVerseLogo size="xl" />
        <div className="loading-spinner" />
        <p>Connecting to global cinematic streaming archive.</p>
      </div>
    );
  }

  // API error state
  if (error) {
    return (
      <div className="app-shell error-screen">
        <CineVerseLogo size="lg" />
        <p>{error}</p>
        <p>Check that your backend is running at http://localhost:3000.</p>
        <button
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      onKeyDown={handleModalKeyDown}
      tabIndex={-1}
    >
      {/* NAVIGATION */}
      <Navbar
        onHome={showHome}
        onDiscover={() => showHomeSection("discovery")}
        onTrending={() => showHomeSection("trending-now")}
        onSearch={() => {
          setSearchOpen(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onWatchlist={() => {
          setActiveTab("Watchlist");
          setSearchQuery("");
          setActiveGenre("All");
          setPendingSection("discovery");
        }}
        onHistory={showHistory}
      />

      {/* SEARCH BAR (WORLDWIDE LIVE SEARCH) */}
      {searchOpen && (
        <div className="search-panel">
          {isSearchingGlobal ? (
            <Loader2 size={20} className="spinning-loader" />
          ) : (
            <Search size={20} />
          )}

          <input
            type="search"
            placeholder="Search ANY movie in the world (e.g. Avatar, Titanic, Inception, RRR)..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setActiveTab("Home");
            }}
            aria-label="Search movies worldwide"
            autoFocus
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setGlobalSearchResults([]);
              }}
              aria-label="Clear search"
              className="search-clear-btn"
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
              setGlobalSearchResults([]);
            }}
            aria-label="Close search"
            className="search-close-btn"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <main>
        {/* HERO SLIDESHOW - NETFLIX STYLE AUTO-PLAY */}
        {!searchQuery && activeTab === "Home" && activeGenre === "All" && featuredList.length > 0 && (
          <HeroSlideshow
            featuredMovies={featuredList}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            onPlay={handlePlay}
          />
        )}

        {/* DISCOVERY HEADER / GENRE PILLS */}
        <section className="discovery-bar" id="discovery">
          <div>
            <span className="section-eyebrow">
              <Sparkles size={12} />
              DISCOVER TRENDING MOVIES & WEB SERIES
            </span>

            <h2>
              {searchQuery
                ? isSearchingGlobal
                  ? `Searching worldwide for "${searchQuery}"...`
                  : `Worldwide Search Results for "${searchQuery}"`
                : activeTab === "Watchlist"
                ? `Your Watchlist (${watchlistMovies.length})`
                : activeTab === "History"
                ? `Watch History (${history.length})`
                : activeGenre !== "All"
                ? `${activeGenre} Films`
                : "Browse Series & Catalogues"}
            </h2>
          </div>

          {activeTab !== "History" && <div className="genre-filters">
            {genres.map((genre) => (
              <button
                key={genre}
                className={activeGenre === genre && !searchQuery ? "active" : ""}
                onClick={() => {
                  setActiveGenre(genre);
                  setSearchQuery("");
                  setActiveTab("Home");
                }}
              >
                {genre}
              </button>
            ))}
          </div>}
        </section>

        {/* MOVIE CATALOGUE & SEARCH RESULTS */}
        <div className="catalogue">
          {/* WATCHLIST VIEW */}
          {activeTab === "Watchlist" && (
            <MovieRow
              title="My Watchlist"
              subtitle="Movies you've saved to watch later"
              movies={watchlistMovies}
              onSelect={setSelectedMovie}
              onPlay={handlePlay}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              showCount={true}
            />
          )}

          {/* WORLDWIDE SEARCH OR GENRE FILTER RESULTS GRID */}
          {(searchQuery || activeGenre !== "All") && !["Watchlist", "History"].includes(activeTab) && (
            <div className="search-grid-wrapper">
              <div className="search-grid-header">
                <div>
                  <h3 className="search-grid-title">
                    {searchQuery
                      ? `Worldwide Movies Matching "${searchQuery}"`
                      : `${activeGenre} Collection`}
                  </h3>
                  <p className="search-grid-subtitle">
                    {isSearchingGlobal
                      ? "Querying TMDB international database..."
                      : isLoadingGenre
                      ? `Searching TMDB worldwide archives for ${activeGenre}...`
                      : `Found ${displayedSearchResults.length} titles available to view`}
                  </p>
                </div>
                {searchQuery && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveGenre("All");
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>

              {displayedSearchResults.length > 0 ? (
                <div className="search-results-grid">
                  {displayedSearchResults.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onSelect={setSelectedMovie}
                      onPlay={handlePlay}
                      isSaved={isSaved(movie.id)}
                      onToggleWatchlist={toggleWatchlist}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={30} />
                  <div>
                    <h3>No movies found</h3>
                    <p>Try searching another title, actor, or genre.</p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveGenre("All");
                    }}
                  >
                    Reset Search
                  </button>
                </div>
              )}
            </div>
          )}

              {/* Web-series focused home rows */}
          {!searchQuery && activeGenre === "All" && activeTab === "Home" && (
            <>
              {continueWatchingMovies.length > 0 && (
                <MovieRow
                  id="continue-watching"
                  title="Continue Watching"
                  subtitle="Pick up where you left off"
                  movies={continueWatchingMovies}
                  onSelect={setSelectedMovie}
                  onPlay={handlePlay}
                  watchlist={watchlist}
                  onToggleWatchlist={toggleWatchlist}
                />
              )}

              {/* Watchlist Quick Row if items exist */}
              {watchlistMovies.length > 0 && (
                <MovieRow
                  id="watchlist-preview"
                  title="Continue Exploring Your Watchlist"
                  subtitle="Saved titles ready for your next movie night"
                  movies={watchlistMovies}
                  onSelect={setSelectedMovie}
                  onPlay={handlePlay}
                  watchlist={watchlist}
                  onToggleWatchlist={toggleWatchlist}
                  showCount={true}
                />
              )}

              {/* Dynamic Netflix Rows */}
              {categories.map((category) => (
                <MovieRow
                  key={category.id}
                  id={category.id}
                  title={category.title}
                  subtitle={category.subtitle}
                  isTop10={category.isTop10}
                  movies={category.movies}
                  onSelect={setSelectedMovie}
                  onPlay={handlePlay}
                  watchlist={watchlist}
                  onToggleWatchlist={toggleWatchlist}
                  showCount={true}
                />
              ))}
            </>
          )}

          {activeTab === "History" && history.length > 0 && (
            <>
              {continueWatchingMovies.length > 0 && (
                <MovieRow
                  id="history-continue"
                  title="Continue Watching"
                  movies={continueWatchingMovies}
                  onSelect={setSelectedMovie}
                  onPlay={handlePlay}
                  watchlist={watchlist}
                  onToggleWatchlist={toggleWatchlist}
                />
              )}
              <MovieRow
                id="recently-watched"
                title="Recently Watched"
                subtitle="Your latest titles are saved on this device"
                movies={history}
                onSelect={setSelectedMovie}
                onPlay={handlePlay}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                showCount
              />
              <div className="history-actions">
                <button type="button" className="btn-secondary" onClick={clearHistory}>
                  Clear watch history
                </button>
              </div>
            </>
          )}

          {activeTab === "History" && history.length === 0 && (
            <div className="empty-state">
              <Clock3 size={32} />
              <div>
                <h3>Your watch history is empty</h3>
                <p>Titles you play will appear here so you can pick them up later.</p>
              </div>
            </div>
          )}

          {/* WATCHLIST EMPTY STATE */}
          {activeTab === "Watchlist" && watchlistMovies.length === 0 && (
            <div className="empty-state">
              <Clock3 size={32} />
              <div>
                <h3>Your watchlist is empty</h3>
                <p>Click "+ My List" on any movie card to save it for later.</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  setActiveTab("Home");
                  scrollToSection("home");
                }}
              >
                Browse Movies
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <a className="brand-logo-link" href="#home" aria-label="Back to top">
          <CineVerseLogo size="md" />
        </a>
        <p>Discover movies and web series with live TMDB data.</p>
        <span>© 2026 CineVerse · Powered by The Movie Database</span>
      </footer>

      {/* GLASS DETAILS MODAL */}
      {selectedMovie && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedMovie(null);
            }
          }}
        >
          <div
            className="movie-modal glass-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close glass-button"
              onClick={() => setSelectedMovie(null)}
              aria-label="Close movie details"
            >
              <X size={20} />
            </button>

            {/* Banner with smooth glass gradient blend */}
            <div className="modal-banner-wrap">
              <img
                src={selectedMovie.backdrop || selectedMovie.poster}
                alt={`${selectedMovie.title} backdrop`}
                loading="eager"
              />
              <div className="modal-banner-fade" />
            </div>

            {/* Modal details body */}
            <div className="modal-body">
              <div className="modal-badge-row">
                <span className="section-eyebrow">
                  <CineVerseEmblem size={13} />
                  SPOTLIGHT
                </span>
                <span className="match-score">
                  {Math.min(
                    99,
                    Math.max(
                      86,
                      Math.round(
                        (parseFloat(selectedMovie.rating) || 7.5) * 8 + 24
                      )
                    )
                  )}
                  % Match
                </span>
              </div>

              <h2 id="modal-title" className="modal-title">
                {selectedMovie.title}
              </h2>

              <div className="hero-meta modal-meta">
                <span className="meta-pill">{selectedMovie.year}</span>
                <span className="meta-divider" />
                <span className="rating modal-rating">
                  <Star size={13} fill="currentColor" />
                  {selectedMovie.rating}
                </span>
                <span className="meta-divider" />
                <span className="meta-pill">{selectedMovie.duration}</span>
                <span className="quality-pill">4K ULTRA HD</span>
                <span className="quality-pill">5.1 AUDIO</span>
              </div>

              <p className="modal-description">
                {selectedMovie.description ||
                  "Discover this title on CineVerse."}
              </p>

              {/* Styled Glass Tags */}
              <div className="modal-tags">
                {(selectedMovie.genres && selectedMovie.genres.length > 0
                  ? selectedMovie.genres
                  : selectedMovie.tags || []
                ).map((genre) => (
                  <span key={genre} className="glass-tag">
                    {genre}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={() => handlePlay(selectedMovie)}
                >
                  <Play size={18} fill="currentColor" />
                  Watch Now
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const isTv = Boolean(selectedMovie.mediaType === "tv" || selectedMovie.isTV);
                    navigate(`/movie/${selectedMovie.id}${isTv ? "?type=tv" : ""}`, {
                      state: { mediaType: isTv ? "tv" : "movie", isTV: isTv },
                    });
                  }}
                >
                  <Info size={18} />
                  View Full Details
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => toggleWatchlist(selectedMovie.id)}
                >
                  {isSaved(selectedMovie.id) ? (
                    <Check size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {isSaved(selectedMovie.id)
                    ? "In My List"
                    : "Add to My List"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PLAYER */}
      {playerMovie && (
        <div className="player-overlay">
          <div className="player-header">
            <div>
              <span className="section-eyebrow">NOW PLAYING</span>
              <h2>{playerMovie.title}</h2>
            </div>

            <button
              className="icon-button"
              onClick={() => setPlayerMovie(null)}
              aria-label="Close video player"
            >
              <X size={24} />
            </button>
          </div>

          <div className="player-content">
            <div className="player-window">
              <VidLinkPlayer
                media={{
                  ...playerMovie,
                  season: playerSeason,
                  episode: playerEpisode,
                  isTV: Boolean(playerMovie.mediaType === "tv" || playerMovie.isTV),
                }}
                onProgress={handlePlayerProgress}
                seasons={playerSeasons}
                episodes={playerEpisodes}
                onSeasonChange={(newSeason) => {
                  setPlayerSeason(newSeason);
                  setPlayerEpisode(1);
                  setPlayerMovie((prev) => ({
                    ...prev,
                    season: newSeason,
                    episode: 1,
                  }));
                }}
                onEpisodeChange={(newEpisode) => {
                  setPlayerEpisode(newEpisode);
                  setPlayerMovie((prev) => ({
                    ...prev,
                    season: playerSeason,
                    episode: newEpisode,
                  }));
                }}
              />
            </div>
            <StreamRecommendations
              movies={streamRecommendations}
              currentMovie={playerMovie}
              onPlay={handlePlay}
              isSaved={isSaved}
              onToggleWatchlist={toggleWatchlist}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
