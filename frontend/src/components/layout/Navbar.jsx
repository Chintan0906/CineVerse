import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bookmark,
  Menu,
  X,
  Home,
  Compass,
  Sparkles,
  History,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import CineVerseLogo from "../common/CineVerseLogo";
import "./Navbar.css";

function Navbar({ onSearch, onWatchlist, onHistory, onHome, onDiscover, onTrending }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Home");

  const navigation = [
    {
      name: "Home",
      href: "#home",
      icon: Home,
    },
    {
      name: "Discover",
      href: "#discovery",
      icon: Compass,
    },
    {
      name: "Trending",
      href: "#trending-now",
      icon: Sparkles,
    },
    {
      name: "History",
      href: "#history",
      icon: History,
    },
  ];

  function handleNavigation(name, href) {
    setActiveLink(name);
    setMenuOpen(false);

    if (name === "Home") {
      onHome?.();
      return;
    }

    if (name === "History") {
      onHistory?.();
      return;
    }

    if (name === "Discover") {
      onDiscover?.();
      return;
    }

    if (name === "Trending") {
      onTrending?.();
      return;
    }

    document.querySelector(href)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleSearch() {
    setMenuOpen(false);
    onSearch?.();
  }

  function handleWatchlist() {
    setMenuOpen(false);
    onWatchlist?.();
  }

  return (
    <header className="navbar">
      {/* BRAND */}
      <a
        href="#home"
        className="brand-logo-link"
        aria-label="CineVerse home"
        onClick={(event) => {
          event.preventDefault();
          handleNavigation("Home", "#home");
        }}
      >
        <CineVerseLogo size="md" />
      </a>

      {/* DESKTOP NAVIGATION */}
      <nav
        className={`nav-links ${menuOpen ? "active" : ""}`}
        aria-label="Main navigation"
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              type="button"
              className={`nav-link ${
                activeLink === item.name ? "active" : ""
              }`}
              onClick={() => handleNavigation(item.name, item.href)}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{item.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="nav-link watchlist-mobile-link"
          onClick={handleWatchlist}
        >
          <Bookmark size={16} />
          <span>My Watchlist</span>
        </button>
        <button
          type="button"
          className="nav-link account-mobile-link"
          onClick={() => {
            setMenuOpen(false);
            if (user) logout().catch((error) => console.error("Sign out failed:", error));
            else navigate("/login");
          }}
        >
          {user ? <LogOut size={16} /> : <ChevronDown size={16} />}
          <span>{user ? "Sign out" : "Sign in / Register"}</span>
        </button>
      </nav>

      {/* RIGHT ACTIONS - REDESIGNED PRO OVAL GLASS BUTTONS */}
      <div className="nav-actions">
        {/* Search button */}
        <button
          type="button"
          className="nav-search-button"
          onClick={handleSearch}
          aria-label="Search movies"
          title="Search any movie in the world"
        >
          <Search size={17} strokeWidth={2.2} />
        </button>

        {/* My List button */}
        <button
          type="button"
          className="nav-watchlist-button"
          onClick={handleWatchlist}
          title="View your saved movies"
        >
          <Bookmark size={15} strokeWidth={2.2} />
          <span>My List</span>
        </button>

        {/* Profile Pill */}
        <button
          className="nav-profile-pill"
          type="button"
          title={user ? "Sign out" : "Sign in or create an account"}
          onClick={() => {
            if (user) {
              logout().catch((error) => console.error("Sign out failed:", error));
            } else {
              navigate("/login");
            }
          }}
        >
          <span className="nav-avatar-box">
            <span>{user?.name?.charAt(0).toUpperCase() || "C"}</span>
          </span>
          <span className="nav-profile-name">{user?.name || "Sign in"}</span>
          {user ? <LogOut size={14} className="nav-profile-chevron" /> : <ChevronDown size={14} className="nav-profile-chevron" />}
        </button>

        {/* Mobile menu hamburger */}
        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}

export default Navbar;
