import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import CineVerseLogo from "../common/CineVerseLogo";

function Footer() {
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop((window.scrollY || 0) > 520);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <footer className="footer cv-footer">
        <div className="cv-footer-inner">
          <div className="cv-footer-brand">
            <button
              type="button"
              className="brand-logo-link cv-footer-logo-btn"
              onClick={scrollToTop}
              aria-label="Back to top"
            >
              <CineVerseLogo size="md" />
            </button>
            <p className="cv-footer-tagline">
              Stream movies, series, and anime with live TMDB metadata and adaptive multi-server playback.
            </p>
          </div>

          <nav className="cv-footer-links" aria-label="Footer navigation">
            <button type="button" onClick={() => navigate("/")}>Home</button>
            <button type="button" onClick={() => navigate("/anime")}>Anime</button>
            <button type="button" onClick={() => navigate("/reels")}>Reels</button>
            <button type="button" onClick={() => navigate("/movie-reels")}>Movie Reels</button>
            <button type="button" onClick={() => navigate("/search")}>Search</button>
            <button type="button" onClick={() => navigate("/?tab=Watchlist")}>Watchlist</button>
          </nav>
        </div>

        <div className="cv-footer-bottom">
          <span>© 2026 CineVerse · Powered by The Movie Database</span>
        </div>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          className="cv-back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={16} />
          <span>Top</span>
        </button>
      )}
    </>
  );
}

export default Footer;
