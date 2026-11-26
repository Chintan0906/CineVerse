import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import HeroSlideshow from "../components/hero/HeroSlideshow";
import MovieRow from "../components/movie/MovieRow";
import MovieCard from "../components/movie/MovieCard";
import { getAnimeCatalog } from "../services/movieService";
import { useLibrary } from "../hooks/useLibrary";
import "../components/hero/HeroSlideshow.css";

const ANIME_FILTERS = [
  { id: "All", label: "All Anime" },
  { id: "Action", label: "Action & Shonen" },
  { id: "Fantasy", label: "Fantasy & Sci-Fi" },
  { id: "Movies", label: "Anime Movies" },
  { id: "TopRated", label: "Top Rated" },
];

function AnimePage() {
  const navigate = useNavigate();
  const { watchlist, updateWatchlist } = useLibrary();
  const animeShellRef = useRef(null);

  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    let active = true;
    document.title = "CineVerse | Anime";
    window.scrollTo({ top: 0, behavior: "instant" });

    getAnimeCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      document.title = "CineVerse | Beyond Entertainment";
    };
  }, []);

  const hasHeroBackdrop = Boolean(catalog?.featured?.length > 0);

  // Progressive hero backdrop blur, scale, and veil on scroll (matching Home & MovieDetails)
  useEffect(() => {
    const el = animeShellRef.current;
    if (!el || !hasHeroBackdrop) return undefined;

    let rafId = 0;
    const updateScrollVars = () => {
      rafId = 0;
      const y = window.scrollY || 0;
      const vh = window.innerHeight || 900;
      const progress = Math.min(Math.max(y / (vh * 0.65), 0), 1);

      el.style.setProperty("--scroll-blur", `${(progress * 24).toFixed(2)}px`);
      el.style.setProperty("--scroll-brightness", `${(1 - progress * 0.58).toFixed(3)}`);
      el.style.setProperty("--scroll-scale", `${(1 + progress * 0.065).toFixed(4)}`);
      el.style.setProperty("--scroll-veil", `${(progress * 0.62).toFixed(3)}`);
      el.style.setProperty("--hero-shift", `${(-progress * 28).toFixed(1)}px`);
      el.style.setProperty("--hero-fade", `${(1 - progress * 0.72).toFixed(3)}`);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScrollVars);
      }
    };

    updateScrollVars();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [hasHeroBackdrop]);

  // Smooth IntersectionObserver + MutationObserver scroll-reveal for rows & discovery bar
  useEffect(() => {
    const root = animeShellRef.current;
    if (!root || !hasHeroBackdrop) return undefined;

    const mainEl = root.querySelector("main") || root;

    if (typeof IntersectionObserver === "undefined") {
      mainEl.querySelectorAll(".discovery-bar, .movie-section").forEach((node) => node.classList.add("is-revealed"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px 80px 0px", threshold: 0.01 }
    );

    const observeTargets = () => {
      const targets = mainEl.querySelectorAll(".discovery-bar:not(.is-revealed), .movie-section:not(.is-revealed)");
      targets.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight + 60) {
          node.classList.add("is-revealed");
        } else {
          observer.observe(node);
        }
      });
    };

    observeTargets();

    let mutationObserver;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        observeTargets();
      });
      mutationObserver.observe(mainEl, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [hasHeroBackdrop, loading, activeFilter]);

  const handleSelectMovie = (movie) => {
    if (!movie?.id) return;
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    navigate(`/movie/${movie.id}${isTv ? "?type=tv" : ""}`, {
      state: {
        movie,
        mediaType: isTv ? "tv" : "movie",
        isTV: isTv,
      },
    });
  };

  const handlePlay = (movie) => {
    if (!movie?.id) return;
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    navigate(
      `/movie/${movie.id}?type=${isTv ? "tv" : "movie"}&play=1${isTv ? "&season=1&episode=1" : ""}`,
      {
        state: {
          movie,
          mediaType: isTv ? "tv" : "movie",
          isTV: isTv,
          autoPlay: true,
        },
      }
    );
  };

  const filteredGridItems = useMemo(() => {
    if (!catalog || activeFilter === "All") return [];
    if (activeFilter === "Action") return catalog.action || [];
    if (activeFilter === "Fantasy") return catalog.fantasy || [];
    if (activeFilter === "Movies") return catalog.movies || [];
    if (activeFilter === "TopRated") return catalog.topRated || [];
    return [];
  }, [catalog, activeFilter]);

  const isSaved = (movie) =>
    watchlist.some((saved) => String(saved?.id ?? saved) === String(movie?.id));

  return (
    <div
      ref={animeShellRef}
      className={`app-shell ${hasHeroBackdrop ? "has-hero-backdrop" : ""}`}
    >
      <Navbar
        onHome={() => navigate("/")}
        onDiscover={() => navigate("/#discovery")}
        onTrending={() => navigate("/#trending-now")}
        onSearch={() => navigate("/search")}
        onWatchlist={() => navigate("/?tab=Watchlist")}
        onHistory={() => navigate("/?tab=History")}
      />

      <main>
        {hasHeroBackdrop && (
          <HeroSlideshow
            featuredMovies={catalog.featured}
            watchlist={watchlist}
            onToggleWatchlist={updateWatchlist}
            onPlay={handlePlay}
          />
        )}

        {/* ANIME DISCOVERY HEADER & FILTER PILLS */}
        <section className="discovery-bar" id="anime-discovery">
          <div>
            <span className="section-eyebrow">
              <Sparkles size={12} />
              JAPANESE ANIMATION &amp; SERIES
            </span>
            <h2>
              {activeFilter === "All"
                ? "Explore All Anime"
                : ANIME_FILTERS.find((f) => f.id === activeFilter)?.label || "Anime"}
            </h2>
          </div>

          <div className="browse-control-stack">
            <div className="genre-filters" aria-label="Filter anime by category">
              {ANIME_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={activeFilter === filter.id ? "active" : ""}
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading && !catalog ? (
          <div className="cv-anime-skeleton" aria-busy="true" aria-label="Loading Anime Universe">
            <div className="hero-skeleton" style={{ minHeight: "72vh", padding: "120px 5% 60px" }}>
              <div className="hero-skeleton-shimmer hero-skeleton-badge" />
              <div className="hero-skeleton-shimmer hero-skeleton-title" />
              <div className="hero-skeleton-shimmer hero-skeleton-meta" />
              <div className="hero-skeleton-shimmer hero-skeleton-desc" />
              <div className="hero-skeleton-shimmer hero-skeleton-buttons" />
            </div>
            <div className="cv-skeleton-row">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`anime-skel-${idx}`} className="cv-skeleton-card skeleton-shimmer" />
              ))}
            </div>
          </div>
        ) : activeFilter !== "All" ? (
          <section className="catalog-grid">
            {filteredGridItems.map((anime, idx) => (
              <MovieCard
                key={`${anime.id}-${idx}`}
                movie={anime}
                onSelect={handleSelectMovie}
                onPlay={handlePlay}
                isSaved={isSaved(anime)}
                onToggleWatchlist={updateWatchlist}
              />
            ))}
          </section>
        ) : (
          <>
            {catalog?.popular?.length > 0 && (
              <MovieRow
                title="Top 10 Trending Anime"
                subtitle="Most watched Japanese animation series right now"
                movies={catalog.popular.slice(0, 10)}
                onSelect={handleSelectMovie}
                onPlay={handlePlay}
                watchlist={watchlist}
                onToggleWatchlist={updateWatchlist}
                isTop10={true}
              />
            )}

            {catalog?.action?.length > 0 && (
              <MovieRow
                title="Action & Shonen"
                subtitle="High-octane battles, powers, and legendary rivalries"
                movies={catalog.action}
                onSelect={handleSelectMovie}
                onPlay={handlePlay}
                watchlist={watchlist}
                onToggleWatchlist={updateWatchlist}
              />
            )}

            {catalog?.fantasy?.length > 0 && (
              <MovieRow
                title="Fantasy & Sci-Fi Worlds"
                subtitle="Isekai adventures, supernatural realms, and cyberpunk epics"
                movies={catalog.fantasy}
                onSelect={handleSelectMovie}
                onPlay={handlePlay}
                watchlist={watchlist}
                onToggleWatchlist={updateWatchlist}
              />
            )}

            {catalog?.topRated?.length > 0 && (
              <MovieRow
                title="Top Rated Anime Classics"
                subtitle="Highest-rated anime series of all time"
                movies={catalog.topRated}
                onSelect={handleSelectMovie}
                onPlay={handlePlay}
                watchlist={watchlist}
                onToggleWatchlist={updateWatchlist}
              />
            )}

            {catalog?.movies?.length > 0 && (
              <MovieRow
                title="Acclaimed Anime Movies"
                subtitle="Feature-length theatrical anime masterpieces"
                movies={catalog.movies}
                onSelect={handleSelectMovie}
                onPlay={handlePlay}
                watchlist={watchlist}
                onToggleWatchlist={updateWatchlist}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default AnimePage;
