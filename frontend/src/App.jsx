import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import SpotlightSearch from "./components/common/SpotlightSearch";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./styles/global.css";
import "./styles/cinematic-refresh.css";

const MovieDetails = lazy(() => import("./pages/MovieDetails"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ReelsPage = lazy(() => import("./pages/ReelsPage"));
const MovieReelsPage = lazy(() => import("./pages/MovieReelsPage"));
const AnimePage = lazy(() => import("./pages/AnimePage"));
const ActorPage = lazy(() => import("./pages/ActorPage"));

function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    document.title = "CineVerse | Beyond Entertainment";

    document.documentElement.style.scrollBehavior = "smooth";

    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("CineVerse offline shell registration failed:", error);
      });
    }

    // ColorOS 17 Luminous Counter-Glow: track pointer coordinates on buttons
    let rafId = 0;
    let lastTarget = null;
    let lastX = 0;
    let lastY = 0;

    const handlePointerMove = (e) => {
      const btn = e.target?.closest?.("button, .cine-server-card");
      if (!btn) return;
      lastTarget = btn;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          if (!lastTarget || !lastTarget.isConnected) return;
          const rect = lastTarget.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const px = (((lastX - rect.left) / rect.width) * 100).toFixed(1);
            const py = (((lastY - rect.top) / rect.height) * 100).toFixed(1);
            lastTarget.style.setProperty("--gx", `${px}%`);
            lastTarget.style.setProperty("--gy", `${py}%`);
          }
        });
      }
    };

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="app">
      <div key={location.pathname} className="route-transition">
        <ErrorBoundary>
          <Suspense fallback={<div className="movie-details-page" style={{ minHeight: "100vh", background: "#070a0d" }} />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route path="/reels" element={<ReelsPage />} />
              <Route path="/movie-reels" element={<MovieReelsPage />} />
              <Route path="/anime" element={<AnimePage />} />
              <Route path="/actor/:id" element={<ActorPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />

              {/* Fallback for unknown routes */}
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
          <SpotlightSearch />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
