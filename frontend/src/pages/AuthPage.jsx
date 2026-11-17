import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock3,
  Compass,
  Eye,
  EyeOff,
  LoaderCircle,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CineVerseLogo from "../components/common/CineVerseLogo";
import "./AuthPage.css";

const SCREENSHOTS = [
  {
    src: "/screenshots/01_dashboard_browse.png",
    title: "Discover",
    caption: "A clean catalogue with genre filters and continue-watching rows.",
  },
  {
    src: "/screenshots/02_series_details_hero.png",
    title: "Details",
    caption: "Backdrops, trailers and everything you need before you press play.",
  },
  {
    src: "/screenshots/03_episodes_browser.png",
    title: "Episodes",
    caption: "Move between seasons without losing your place.",
  },
  {
    src: "/screenshots/04_cast_and_recommendations.png",
    title: "Recommendations",
    caption: "Explore cast and titles picked from what you already watch.",
  },
];

const FEATURES = [
  {
    icon: Compass,
    title: "Global catalogue",
    text: "Search movies, series and people across a worldwide database.",
  },
  {
    icon: Bookmark,
    title: "Your watchlist",
    text: "Save anything you love and come back to it whenever you like.",
  },
  {
    icon: Clock3,
    title: "Continue watching",
    text: "Your progress is remembered between sessions.",
  },
  {
    icon: Sparkles,
    title: "Made for you",
    text: "Recommendations shaped by the genres you actually watch.",
  },
];

function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const items = [...root.querySelectorAll("[data-reveal]")];
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const reveal = (item) => item.classList.add("is-revealed");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(reveal);
      return undefined;
    }

    // Guarantee above-the-fold content is visible even if IntersectionObserver
    // callbacks are delayed (background tabs, prerender, reduced visibility).
    const revealInViewport = () => {
      items.forEach((item) => {
        if (item.classList.contains("is-revealed")) return;
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight - 24 && rect.bottom > 0) reveal(item);
      });
    };

    revealInViewport();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -28px 0px" }
    );

    items.forEach((item) => {
      if (!item.classList.contains("is-revealed")) observer.observe(item);
    });

    const safetyTimer = window.setTimeout(revealInViewport, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(safetyTimer);
    };
  }, [rootRef]);
}

function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const pageRef = useRef(null);
  const showcaseRef = useRef(null);
  const galleryRef = useRef(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeShot, setActiveShot] = useState(0);

  useReveal(pageRef);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) await register({ name, email, password });
      else await login({ email, password });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSpotlight(event) {
    const element = showcaseRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    element.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    element.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  }

  function goToShot(index) {
    const next = (index + SCREENSHOTS.length) % SCREENSHOTS.length;
    setActiveShot(next);
    const gallery = galleryRef.current;
    if (gallery) {
      gallery.scrollTo({ left: next * gallery.clientWidth, behavior: "smooth" });
    }
  }

  function handleGalleryScroll(event) {
    const gallery = event.currentTarget;
    const next = Math.round(gallery.scrollLeft / Math.max(gallery.clientWidth, 1));
    setActiveShot((current) => (current === next ? current : next));
  }

  return (
    <main className="auth-page" ref={pageRef}>
      <div className="auth-aurora" aria-hidden="true">
        <span className="auth-aurora-blob auth-aurora-blob-a" />
        <span className="auth-aurora-blob auth-aurora-blob-b" />
        <span className="auth-aurora-grid" />
      </div>

      <header className="auth-navbar">
        <Link className="auth-brand-logo" to="/" aria-label="CineVerse home">
          <CineVerseLogo size="md" />
        </Link>
        <Link className="auth-home-link" to="/">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Home
        </Link>
      </header>

      <div className="auth-layout">
        <section
          className="auth-showcase"
          aria-label="About CineVerse"
          ref={showcaseRef}
          onPointerMove={handleSpotlight}
        >
          <span className="auth-spotlight" aria-hidden="true" />

          <div className="auth-showcase-copy">
            <span className="auth-eyebrow" data-reveal>
              <span className="auth-pulse-dot" aria-hidden="true" />
              CINEVERSE · YOUR CINEMATIC SPACE
            </span>

            <h1 data-reveal style={{ "--reveal-delay": "80ms" }}>
              Stories worth<br />
              <span className="auth-gradient-text">staying in</span> for.
            </h1>

            <p data-reveal style={{ "--reveal-delay": "160ms" }}>
              One place to discover what to watch next, keep your favourites close,
              and pick up right where you left off.
            </p>

            <div className="auth-feature-grid" data-reveal style={{ "--reveal-delay": "240ms" }}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div className="auth-feature" key={title} tabIndex={0}>
                  <span className="auth-feature-icon" aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <span className="auth-feature-body">
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-showcase-gallery" data-reveal style={{ "--reveal-delay": "320ms" }}>
            <div className="auth-gallery-heading">
              <div>
                <span className="auth-gallery-kicker">A LOOK INSIDE</span>
                <h2>Built for browsing</h2>
              </div>
              <div className="auth-gallery-controls">
                <button
                  type="button"
                  className="auth-gallery-arrow"
                  onClick={() => goToShot(activeShot - 1)}
                  aria-label="Previous screenshot"
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="auth-gallery-arrow"
                  onClick={() => goToShot(activeShot + 1)}
                  aria-label="Next screenshot"
                >
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              className="auth-gallery-scroller"
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              role="region"
              aria-roledescription="carousel"
              aria-label="CineVerse interface screenshots"
              tabIndex={0}
            >
              {SCREENSHOTS.map((shot, index) => (
                <figure
                  className="auth-shot"
                  key={shot.src}
                  aria-label={`${index + 1} of ${SCREENSHOTS.length}: ${shot.title}`}
                >
                  <img
                    src={shot.src}
                    alt={`CineVerse interface showing ${shot.title.toLowerCase()}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    draggable="false"
                  />
                  <figcaption className="auth-shot-caption">
                    <span className="auth-shot-index">
                      0{index + 1} / 0{SCREENSHOTS.length}
                    </span>
                    <strong>{shot.title}</strong>
                    <span>{shot.caption}</span>
                  </figcaption>
                  <span className="auth-shot-play" aria-hidden="true">
                    <Play size={14} fill="currentColor" />
                  </span>
                </figure>
              ))}
            </div>

            <div className="auth-gallery-dots" role="tablist" aria-label="Choose screenshot">
              {SCREENSHOTS.map((shot, index) => (
                <button
                  type="button"
                  key={shot.src}
                  role="tab"
                  aria-selected={activeShot === index}
                  aria-label={`Show screenshot ${index + 1}: ${shot.title}`}
                  className={`auth-gallery-dot${activeShot === index ? " is-active" : ""}`}
                  onClick={() => goToShot(index)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="auth-title" data-reveal style={{ "--reveal-delay": "120ms" }}>
          <div className="auth-heading">
            <span className="auth-eyebrow">
              {isRegister ? "JOIN CINEVERSE" : "WELCOME BACK"}
            </span>
            <h2 id="auth-title">
              {isRegister ? "Create your account" : "Sign in to CineVerse"}
            </h2>
            <p>
              {isRegister
                ? "Build a watchlist that feels like yours."
                : "Your watchlist is right where you left it."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Name</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    minLength={2}
                    maxLength={60}
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <div className="auth-input-wrap">
                <input
                  id="auth-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "At least 8 characters" : "Your password"}
                  minLength={isRegister ? 8 : undefined}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="auth-error" role="alert">
                <ShieldCheck size={15} aria-hidden="true" />
                {error}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={submitting}>
              <span className="auth-submit-label">
                {submitting && <LoaderCircle className="auth-spinner" size={17} />}
                {submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
              </span>
              {!submitting && <ArrowRight className="auth-submit-arrow" size={17} aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to CineVerse?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </p>

          <p className="auth-footnote">
            <ShieldCheck size={13} aria-hidden="true" />
            Your account details are stored securely on CineVerse.
          </p>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
