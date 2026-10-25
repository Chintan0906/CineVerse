import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import AuthPage from "./pages/AuthPage";
import { AuthProvider } from "./context/AuthContext";
import "./styles/global.css";
import "./styles/cinematic-refresh.css";

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
  }, []);

  return (
    <div className="app">
      <div key={location.pathname} className="route-transition">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
