# FaceMatch – Event Photo Face Matching (Monorepo)

FaceMatch helps event organizers match attendee selfies against a collection of event photos. This monorepo contains:

- Backend: Node.js/Express API for auth, rooms, uploads, and basic matching
- Frontend: React (Vite) client
- Flask Advanced Backend: Python/Flask service for industrial-grade face recognition

---

## Monorepo Structure

```
.
├─ backend/          # Node/Express API (auth, rooms, uploads, basic match)
├─ frontend/         # React + Vite app
└─ flask-backend/    # Advanced Flask service for face analysis/matching
```

---

## Quick Start (Windows)

Prerequisites:
- Node.js 18+ and npm
- Python 3.8+ (3.9 recommended) with pip

1) Install dependencies
```
cd backend && npm install
cd ../frontend && npm install
```

2) Set environment variables
- Backend (Node): create `backend/.env` with at least:
```
PORT=4000
JWT_SECRET=change_me
UPLOAD_DIR=uploads
DATA_DIR=data
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- Frontend (Vite): create `frontend/.env` to point to the Node API
```
VITE_API_BASE=http://localhost:4000/api
```

3) Run services
- Node API
```
cd backend
npm run dev
# API at http://localhost:4000, health: http://localhost:4000/api/health
```

- Flask Advanced (optional but recommended for real face recognition)
```
cd flask-backend
python install_advanced.py
python run_advanced.py
# Health: http://localhost:5000/health
```

- Frontend
```
cd frontend
npm run dev
# App at http://localhost:5173 by default
```

---

## Backend (Node/Express)

Entry: `backend/src/index.js`

Key routes (prefixed with `/api`):
- `POST /api/auth/signup` – email/password signup with role
- `POST /api/auth/login` – email/password login, returns JWT
- `POST /api/rooms` – create room (requires organizer role)
- `GET /api/rooms/mine` – list rooms owned by organizer
- `GET /api/rooms/by-key/:key` – lookup room by short key
- `POST /api/uploads/room/:roomId` – organizer uploads reference photos (local storage)
- `POST /api/uploads/candidate/:roomId` – attendee uploads a candidate photo (local)
- `POST /api/uploads/upload-photos` – event-based upload via Cloudinary
- `POST /api/match/:roomId` – basic/stub match using filename heuristic

Environment variables (see `.env` above): `PORT`, `JWT_SECRET`, `UPLOAD_DIR`, `DATA_DIR`, and Cloudinary credentials.

Notes:
- Local uploads are served at `/uploads/*` from `backend/uploads/`.
- Cloudinary storage is configured in `backend/src/config/cloudinary.js`.

---

## Flask Advanced Backend

Location: `flask-backend/`

Docs: see `flask-backend/README_ADVANCED.md` and `flask-backend/README_V2.md` (ArcFace + FAISS).

Quick run:
```
cd flask-backend
python install_advanced.py
python run_advanced.py
# Health: http://localhost:5000/health
```

Primary API (examples):
- V1 (legacy)
  - `POST /api/face/analyze` – analyze uploaded image (128‑dim)
  - `POST /api/face/analyze-url` – analyze by image URL
  - `POST /api/face/match` – match a user descriptor against a collection
- V2 (industry-grade, ArcFace + FAISS)
  - `POST /api/v2/analyze` – returns 512‑dim ArcFace embedding for an uploaded image
  - `POST /api/v2/ingest` – ingests a photo (indexes all faces per photo) for fast search
  - `POST /api/v2/match` – fast cosine similarity search over FAISS index

Troubleshooting (Windows):
- If `dlib` build fails, install Visual C++ Build Tools, then retry.

---

## Frontend (React + Vite)

Location: `frontend/`

Environment:
- `VITE_API_BASE` points to the Node API base (default `http://localhost:4000/api`).
- The frontend also integrates with the Flask service at `http://localhost:5000/api` via `frontend/src/utils/flaskFaceApi.js`.
- V2 flow (fast matching): the frontend sends the user image to `/api/v2/analyze` to get a real ArcFace embedding, then queries `/api/v2/match`.

Development:
```
cd frontend
npm run dev
```

---

## Typical Development Flow

1) Start Flask backend (for real recognition) on port 5000
2) Start Node API on port 4000
3) Start frontend dev server on port 5173

In the app:
- Organizer signs up/logs in, creates an event, uploads photos (Cloudinary). Ingest runs and indexes all faces per photo in FAISS.
- Attendee uploads a selfie; frontend requests ArcFace embedding from `/api/v2/analyze`, then `/api/v2/match` returns fast results. V1 is used as a fallback.

---

## Ports and URLs
- Node API: `http://localhost:4000` (health: `/api/health`)
- Flask Advanced: `http://localhost:5000` (health: `/health`)
- Frontend Dev: `http://localhost:5173`

---

## Troubleshooting

- CORS issues: ensure both backends are running and reachable from the frontend origin.
- JWT errors: verify `JWT_SECRET` and that the `Authorization: Bearer <token>` header is sent.
- Cloudinary upload issues: confirm `CLOUDINARY_*` vars and that the account allows uploads.
- Flask `dlib`/build errors (Windows): install Visual Studio Build Tools; rerun `install_advanced.py`.
- V2 analyze 404/500: confirm frontend uses `http://localhost:5000/api/v2/analyze` (see `flaskFaceApi.js`) and Flask is running. A no-face image returns success with `embedding: null`.
- Low recall: re‑ingest photos so all faces per photo are indexed; lower V2 threshold (0.30–0.35) or use an "expand search" pass with a lower threshold.

---

## Scripts Reference

Backend (`backend/package.json`):
- `npm run dev` – start with nodemon
- `npm start` – start once

Frontend (`frontend/package.json`):
- `npm run dev` – Vite dev server
- `npm run build` – production build
- `npm run preview` – preview build

---

## Security & Data
- Demo persistence uses JSON files in `backend/data/`. Do not use in production.
- Face data processed by Flask service is not persisted by default.
- Add rate limiting and request size limits in production.

---

## License
This project is provided as-is for demonstration and educational purposes.





