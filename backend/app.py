import os
from flask import Flask, request, jsonify
import tempfile
import subprocess
import librosa
import numpy as np
from flask_cors import CORS


# Create Flask Object
app = Flask(__name__)
CORS(app)
# Create decorator to define URL routes
# /analzye is the endpoint URl
# Only handles data submissions (POST) not retrievals (GET)
def detect_chords(audio_path):
    # Load the audio file
    y, sr = librosa.load(audio_path, mono=True)
    # Every 4096 samples, librosa takes a snapshot of what notes are present at that moment
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=4096)
    chords = []
    # chroma.shape[1] — gets total number of time frames in the song
    # chroma[:, i] — slices out chroma data for frame i specifically — all 12 pitch classes at that moment
    # np.argmax(frame_chroma) — finds index of the most dominant pitch, then maps it to a chord name
    # librosa.frames_to_time() — converts frame number i into  seconds so we know when in the song this chord occurs
    for i in range(chroma.shape[1]):
        frame_chroma = chroma[:, i]
        chord_idx = np.argmax(frame_chroma)
        chord_name = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][chord_idx]
        time = round(librosa.frames_to_time(i, sr=sr, hop_length=4096), 2)
        chords.append({"time": time, "chord": chord_name})
    return chords

def detect_tempo_and_key(audio_path):
    # y — stands for the audio signal (numpy array where each number represents the amplitude of the sound wave at that instant). 
    # sr — stands for sample rate (how many of those samples exist per second). 
    y, sr = librosa.load(audio_path, mono=True)
    # Detect tempo
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = round(float(tempo[0]), 1)
    # FInd chroma features to detect musical key. Chroma captures the energy present in each of the 12 musical pitch classes.
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    # Finds pitch of the song (Returns index of most common note within song)
    tonic = notes[np.argmax(chroma_mean)]
    # Detects fi song is major or minor
    minor_third_idx = (np.argmax(chroma_mean) + 3) % 12
    major_third_idx = (np.argmax(chroma_mean) + 4) % 12
    if chroma_mean[minor_third_idx] > chroma_mean[major_third_idx]:
        key = f"{tonic} minor"
    else:
        key = f"{tonic} major"
    return tempo, key

@app.route("/analyze", methods=["POST"])
def chordPath():
    # Check if a MP3 file was submitted and in in request.files
    if "file" in request.files:
        file = request.files["file"]
    else:
        return jsonify({"error": "Please import an MP3 file"}), 400
    
    # Create temp folder, create a path to store the file, and store that file within the path
    tmp_dir = tempfile.mkdtemp()
    input_path = os.path.join(tmp_dir, "song.mp3")
    file.save(input_path)

    # song.mp3 → 
    # saved to disk at input_path → 
    # Demucs reads it from there → 
    # outputs no_vocals.wav into tmp_dir
    try:
        subprocess.run([
            r"C:\Users\mkher\Desktop\ChordPath\backend\venv\Scripts\python.exe", "-m", "demucs", 
            "--two-stems", "vocals",
            "-o", tmp_dir, 
            input_path
        ], check=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Save output file path
    melody_path = os.path.join(tmp_dir, "htdemucs", "song", "no_vocals.wav")

    # Gather chords and key
    chords = detect_chords(melody_path)
    tempo, key = detect_tempo_and_key(melody_path)

    return jsonify({"chords": chords, "tempo": tempo, "key": key})

if __name__ == "__main__":
    app.run(debug=True, port=5000)