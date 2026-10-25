# CineVerse 🎬
> Beyond Entertainment — A modern, high-performance Netflix-inspired streaming web platform.

[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg?logo=node.js)](https://nodejs.org/)
[![TMDB API](https://img.shields.io/badge/TMDB-API_v3-01b4e4.svg?logo=themoviedatabase)](https://www.themoviedb.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

- **Cinematic UI/UX**: Ultra-modern glassmorphic interface inspired by Netflix with oval pill controls and a pure monochrome palette.
- **Worldwide TMDB Integration**: Live, debounced search across the entire global TMDB catalog for movies, TV series, actors, and directors.
- **Multi-Server Streaming**: Seamless server switcher with disguised mirror feeds supporting 1080p Full HD and 4K UHD playback.
- **Dedicated Movie & TV Pages**: Full details including high-res backdrops, official trailers, cast grids, budget/revenue stats, and recommendations.
- **Responsive Slideshow Hero**: Auto-advancing billboard carousel showcasing top-trending cinema with smooth crossfades and live indicators.
- **Zero Video Bandwidth Burden**: Media streaming is handled by external CDN engines, allowing the app to scale infinitely at zero hosting cost.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS with glassmorphism, responsive flex/grid, and custom keyframe animations
- **Routing**: React Router DOM (v6)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js + Express
- **Metadata**: The Movie Database (TMDB) API + OMDb API
- **Networking**: Custom DNS dispatcher (8.8.8.8 / 1.1.1.1) to bypass regional ISP blocks

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/Chintan0906/CineVerse.git
cd CineVerse
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
The backend server will start on `http://localhost:3000`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```
The frontend will start on `http://localhost:5173`.

---

## 🌐 Deployment

- **Frontend**: One-click deploy on [Vercel](https://vercel.com) (Root directory: `frontend`).
- **Backend**: Free deploy on [Render](https://render.com) or [Koyeb](https://koyeb.com) (Root directory: `backend`).

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
