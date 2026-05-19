import os
import hashlib
import json
from flask import Flask, request, jsonify
import tempfile
import subprocess
import librosa
import numpy as np
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

load_dotenv()

# Create Flask Object
app = Flask(__name__)
CORS(app)

# Database config
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# Database models
class Song(db.Model):
    __tablename__ = "songs"
    id = db.Column(db.Integer, primary_key=True)
    file_hash = db.Column(db.String(64), unique=True, nullable=False)
    song_name = db.Column(db.String(255))
    key = db.Column(db.String(50))
    tempo = db.Column(db.Float)
    chords = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class UserSong(db.Model):
    __tablename__ = "user_songs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey("songs.id"))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

def detect_chords(audio_path):
    y, sr = librosa.load(audio_path, mono=True)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=4096)
    chords = []
    for i in range(chroma.shape[1]):
        frame_chroma = chroma[:, i]
        chord_idx = np.argmax(frame_chroma)
        chord_name = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][chord_idx]
        time = round(librosa.frames_to_time(i, sr=sr, hop_length=4096), 2)
        chords.append({"time": time, "chord": chord_name})
    return chords

def detect_tempo_and_key(audio_path):
    y, sr = librosa.load(audio_path, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = round(float(tempo[0]), 1)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    tonic = notes[np.argmax(chroma_mean)]
    minor_third_idx = (np.argmax(chroma_mean) + 3) % 12
    major_third_idx = (np.argmax(chroma_mean) + 4) % 12
    if chroma_mean[minor_third_idx] > chroma_mean[major_third_idx]:
        key = f"{tonic} minor"
    else:
        key = f"{tonic} major"
    return tempo, key

def hash_file(file):
    md5 = hashlib.md5()
    file.seek(0)
    for chunk in iter(lambda: file.read(8192), b""):
        md5.update(chunk)
    file.seek(0)
    return md5.hexdigest()

@app.route("/analyze", methods=["POST"])
def chordPath():
    if "file" not in request.files:
        return jsonify({"error": "Please import an MP3 file"}), 400

    file = request.files["file"]
    user_id = request.form.get("user_id", "anonymous")
    song_name = file.filename

    # Hash the file
    file_hash = hash_file(file)

    # Check cache
    existing_song = Song.query.filter_by(file_hash=file_hash).first()
    if existing_song:
        # Log user_song entry if user is logged in
        if user_id != "anonymous":
            already_saved = UserSong.query.filter_by(user_id=user_id, song_id=existing_song.id).first()
            if not already_saved:
                user_song = UserSong(user_id=user_id, song_id=existing_song.id)
                db.session.add(user_song)
                db.session.commit()
        return jsonify({
            "chords": existing_song.chords,
            "tempo": existing_song.tempo,
            "key": existing_song.key,
            "cached": True
        })

    # Not cached — process it
    tmp_dir = tempfile.mkdtemp()
    input_path = os.path.join(tmp_dir, "song.mp3")
    file.save(input_path)

    try:
        subprocess.run([
            r"C:\Users\mkher\Desktop\ChordPath\backend\venv\Scripts\python.exe", "-m", "demucs",
            "--two-stems", "vocals",
            "-o", tmp_dir,
            input_path
        ], check=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    melody_path = os.path.join(tmp_dir, "htdemucs", "song", "no_vocals.wav")
    chords = detect_chords(melody_path)
    tempo, key = detect_tempo_and_key(melody_path)

    # Save to database
    new_song = Song(
        file_hash=file_hash,
        song_name=song_name,
        key=key,
        tempo=tempo,
        chords=chords
    )
    db.session.add(new_song)
    db.session.commit()

    # Link to user
    if user_id != "anonymous":
        user_song = UserSong(user_id=user_id, song_id=new_song.id)
        db.session.add(user_song)
        db.session.commit()

    return jsonify({"chords": chords, "tempo": tempo, "key": key, "cached": False})

@app.route("/my-songs", methods=["GET"])
def my_songs():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    user_songs = db.session.query(Song).join(UserSong).filter(
        UserSong.user_id == user_id
    ).order_by(Song.created_at.desc()).all()
    
    return jsonify([{
        "id": s.id,
        "song_name": s.song_name,
        "created_at": s.created_at.strftime("%b %d, %Y"),
        "chords": s.chords,
        "key": s.key,
        "tempo": s.tempo
    } for s in user_songs])

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)