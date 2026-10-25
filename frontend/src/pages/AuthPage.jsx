import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Clapperboard, Film, LoaderCircle, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <main className="auth-page">
      <div className="auth-atmosphere" />
      <header className="auth-navbar">
        <Link className="auth-brand" to="/" aria-label="CineVerse home">
          <span className="brand-icon"><span /><span /><span /></span>
          <span className="brand-name">CINE<span>VERSE</span><span className="brand-dot">.</span></span>
        </Link>
        <Link className="auth-home-link" to="/">Back to Home</Link>
      </header>

      <div className="auth-layout">
        <section className="auth-showcase" aria-label="CineVerse benefits">
          <div className="auth-showcase-copy">
            <span className="auth-eyebrow"><Sparkles size={14} /> YOUR NEXT WATCH STARTS HERE</span>
            <h1>Stories worth<br />staying in for.</h1>
            <p>Find your next favorite movie or series, and keep every pick in one place.</p>
            <div className="auth-benefits">
              <span><Film size={16} /> Movies &amp; series</span>
              <span><Bookmark size={16} /> Your watchlist</span>
            </div>
          </div>
          <div className="auth-art" aria-hidden="true">
            <div className="auth-art-glow" />
            <div className="auth-poster auth-poster-back"><span>FEATURED</span><i /></div>
            <div className="auth-poster auth-poster-front"><span>NOW PLAYING</span><i /></div>
            <div className="auth-art-caption"><span className="auth-live-dot" /> A universe of stories</div>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-heading">
            <span className="auth-eyebrow">{isRegister ? "JOIN CINEVERSE" : "WELCOME BACK"}</span>
            <h2 id="auth-title">{isRegister ? "Create your account" : "Sign in to CineVerse"}</h2>
            <p>{isRegister ? "Build a watchlist that feels like yours." : "Your watchlist is right where you left it."}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                Name
                <input
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
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 8 characters" : "Your password"}
                minLength={isRegister ? 8 : undefined}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting && <LoaderCircle className="auth-spinner" size={18} />}
              {submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to CineVerse?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="auth-footnote">Your account details are stored securely on CineVerse.</p>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
