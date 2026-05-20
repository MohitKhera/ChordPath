# ChordPath

Upload an MP3, and ChordPath analyzes it — detecting chords, key, and tempo — then displays the correct finger positions on a guitar diagram as the song plays.

---

## Features

- **Audio analysis** — uploads an MP3 and separates vocals from instruments using Demucs, then detects chords, key, and tempo using librosa
- **Real-time chord diagrams** — displays the correct guitar fingering diagram synced to playback, including barre chords and fret offset labels
- **Playback controls** — play/pause, scrub through the song, and change playback speed (0.5x, 0.75x, 1x, 1.5x)
- **Smart caching** — analyzed songs are stored in PostgreSQL so the same MP3 is never processed twice, even across different users
- **User authentication** — sign in with Google or email via Clerk
- **Personal library** — each user's analyzed songs are saved and accessible instantly from their library

---

## Tech Stack

**Frontend**
- React + Vite
- Clerk (authentication)
- Custom SVG chord diagram renderer

**Backend**
- Python + Flask
- Demucs (vocal separation)
- librosa (chord, key, and tempo detection)
- SQLAlchemy + PostgreSQL (caching and user data)
- Clerk (session verification)

---

## Running Locally

### Prerequisites
- Node.js
- Python 3.11+
- PostgreSQL 18

### 1. Clone the repo
```bash
git clone https://github.com/MohitKhera/ChordPath.git
cd ChordPath
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/chordpath
```

Create the database:
```bash
psql -U postgres -c "CREATE DATABASE chordpath;"
```

Start the backend:
```bash
python app.py
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Start the frontend:
```bash
npm run dev
```

### 4. Open the app
Go to `http://localhost:5173`

---

## How It Works

1. User uploads an MP3
2. Flask hashes the file (MD5) and checks PostgreSQL for a cached result
3. If cached → returns instantly from the database
4. If not cached → runs Demucs to remove vocals, then librosa to detect chords, key, and tempo
5. Result is saved to PostgreSQL and linked to the user's account
6. Frontend displays chord diagrams synced to audio playback in real time

---

## Project Structure

```
ChordPath/
├── backend/
│   ├── app.py              # Flask API
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main app and routing logic
│   │   ├── ChordDiagram.jsx # SVG chord diagram component
│   │   ├── App.css         # Styles
│   │   └── main.jsx        # React entry point
│   └── package.json
└── README.md
```

---

## Notes

- Chord detection is optimized for standard open and barre chord shapes (beginner/intermediate level)
- Analysis takes 2–5 minutes on first run depending on song length and hardware
