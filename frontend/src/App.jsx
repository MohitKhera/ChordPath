import { useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState("upload")
  const [file, setFile] = useState(null)
  const [songData, setSongData] = useState(null)

const simplifyChords = (chords) => {
  const simplified = []
  
  chords.forEach((chord, i) => {
      if (simplified.length === 0 || simplified[simplified.length - 1].chord !== chord.chord) {
        simplified.push({ ...chord })
      }
    })
    // Calculate duration AFTER grouping
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
  return (
    <div className="app">
      {status === "upload" && (
        <div>
          <h1>ChordPath</h1>
          <p>Upload an MP3 to learn how to play it on guitar</p>
          <input 
            type="file" 
            accept=".mp3" 
            onChange={(e) => setFile(e.target.files[0])} 
          />
          <button onClick={handleSubmit}>Analyze Song</button>
        </div>
      )}
      {status === "loading" && <h1>Loading Screen</h1>}
      {status === "results" && (
        <div>
          <h1>Results Screen</h1>
          <pre>{JSON.stringify(songData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App