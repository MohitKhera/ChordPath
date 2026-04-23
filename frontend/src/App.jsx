import { useState, useRef, useEffect } from 'react'
import './App.css'
import ChordDiagram from './ChordDiagram'

function App() {
  const [status, setStatus] = useState("upload")
  const [file, setFile] = useState(null)
  const [songData, setSongData] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const lastChordRef = useRef(null)

  useEffect(() => {
    if (status === "results" && file) {
      const url = URL.createObjectURL(file)
      audioRef.current = new Audio(url)
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime)
      })
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration)
      })
    }
  }, [status])

  const simplifyChords = (chords) => {
    const simplified = []
    chords.forEach((chord) => {
      if (simplified.length === 0 || simplified[simplified.length - 1].chord !== chord.chord) {
        simplified.push({ ...chord })
      }
    })
    return simplified.map((chord, i) => ({
      ...chord,
      duration: simplified[i + 1]
        ? Math.round((simplified[i + 1].time - chord.time) * 100) / 100
        : 2.0
    })).filter(chord => chord.duration >= 1.0)
  }

  const handleSubmit = async () => {
    setStatus("loading")
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      body: formData
    })
    const data = await response.json()
    setSongData({
      ...data,
      chords: simplifyChords(data.chords)
    })
    setStatus("results")
  }

  const formatTime = (t) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="app">

      {/* ── UPLOAD SCREEN ── */}
      {status === "upload" && (
        <div className="upload-screen">
          <div className="logo-lockup">
            <div className="logo-icon">♩</div>
            <h1 className="logo-text">ChordPath</h1>
          </div>
          <p className="tagline">Drop an MP3. Learn the chords.</p>

          <label className="file-drop">
            <input
              type="file"
              accept=".mp3"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <div className="drop-inner">
              <span className="drop-icon">↑</span>
              <span className="drop-label">
                {file ? file.name : 'Choose an MP3 file'}
              </span>
            </div>
          </label>

          <button
            className="analyze-btn"
            onClick={handleSubmit}
            disabled={!file}
          >
            Analyze Song
          </button>
        </div>
      )}

      {/* ── LOADING SCREEN ── */}
      {status === "loading" && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Analyzing your song…</p>
          <p className="loading-sub">Separating stems · Detecting chords · Finding key</p>
        </div>
      )}

      {/* ── RESULTS SCREEN ── */}
      {status === "results" && (
        <div className="results-screen">
          {/* Header */}
          <div className="results-header">
            <span className="results-logo">ChordPath</span>
            <div className="song-meta">
              <span className="meta-pill">🎵 {songData.key}</span>
              <span className="meta-pill">♩ {songData.tempo} BPM</span>
            </div>
          </div>

          {/* Main chord display */}
          {(() => {
            const activeChord = songData.chords.find(chord =>
              currentTime >= chord.time && currentTime < chord.time + chord.duration
            )
            if (activeChord) lastChordRef.current = activeChord
            const displayChord = activeChord || lastChordRef.current

            return displayChord ? (
              <div className="chord-display">
                <div className="chord-name-display">{displayChord.chord}</div>
                <div className="diagram-wrapper">
                  <ChordDiagram chord={displayChord.chord} />
                </div>
              </div>
            ) : (
              <div className="chord-display">
                <p className="waiting-text">Press play to begin</p>
              </div>
            )
          })()}

          {/* Progress bar */}
          <div className="progress-section">
            <span className="time-label">{formatTime(currentTime)}</span>
            <input
              className="scrubber"
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                audioRef.current.currentTime = parseFloat(e.target.value)
                setCurrentTime(parseFloat(e.target.value))
              }}
            />
            <span className="time-label">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="controls">
            <div className="playback-controls">
              <button className="ctrl-btn" onClick={() => { audioRef.current.currentTime = 0; setCurrentTime(0); setIsPlaying(false) }}>⟨⟨</button>
              <button className="ctrl-btn play-btn" onClick={() => {
                if (isPlaying) {
                  audioRef.current.pause()
                  setIsPlaying(false)
                } else {
                  audioRef.current.play()
                  setIsPlaying(true)
                }
              }}>{isPlaying ? '⏸' : '▶'}</button>
            </div>
            <div className="speed-controls">
              {[0.5, 0.75, 1, 1.5].map(rate => (
                <button
                  key={rate}
                  className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
                  onClick={() => {
                    audioRef.current.playbackRate = rate
                    setPlaybackRate(rate)
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
