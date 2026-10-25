const express = require("express");
const {
  createUser,
  verifyUser,
  createSession,
  getUserForSession,
  deleteSession,
  SESSION_TTL_MS,
} = require("../../services/authService");

const router = express.Router();
const COOKIE_NAME = "cineverse_session";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const production = process.env.NODE_ENV === "production";

function getCookie(req, name) {
  const cookies = (req.headers.cookie || "").split(";");
  const value = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : "";
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/api/auth",
  });
}

router.get("/me", (req, res) => {
  const user = getUserForSession(getCookie(req, COOKIE_NAME));
  if (!user) return res.status(401).json({ message: "Not signed in." });
  return res.json({ user });
});

router.post("/register", async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ message: "Name must be between 2 and 60 characters." });
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
  }

  try {
    const user = await createUser({ name, email, password });
    const session = createSession(user.id);
    setSessionCookie(res, session.token);
    return res.status(201).json({ user });
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message)) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    console.error("Registration failed:", error.message);
    return res.status(500).json({ message: "Unable to create your account right now." });
  }
});

router.post("/login", async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return res.status(400).json({ message: "Enter your email and password." });
  }

  try {
    const user = await verifyUser(email, password);
    if (!user) return res.status(401).json({ message: "Email or password is incorrect." });
    const session = createSession(user.id);
    setSessionCookie(res, session.token);
    return res.json({ user });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Unable to sign in right now." });
  }
});

router.post("/logout", (req, res) => {
  deleteSession(getCookie(req, COOKIE_NAME));
  clearSessionCookie(res);
  return res.json({ success: true });
});

module.exports = router;
