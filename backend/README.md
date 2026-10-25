# CineVerse backend

## User accounts

The API creates `data/cineverse.sqlite` automatically on first start. It stores user profiles, salted password hashes, and hashed session tokens. The session cookie is HTTP-only. To store the database elsewhere, set `DATABASE_PATH` in `.env` to an absolute file path.

Run the backend with Node.js 22.5 or newer:

```sh
npm install
npm run dev
```

Account endpoints are available at `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, and `/api/auth/logout`.
