const CHORD_DICT = {
  "D":  { frets: [null, null, 0, 2, 3, 2], fingers: [null, null, 0, 1, 3, 2] },
  "A":  { frets: [null, 0, 2, 2, 2, 0],    fingers: [null, 0, 2, 1, 3, 0] },
  "G":  { frets: [3, 2, 0, 0, 0, 3],       fingers: [2, 1, 0, 0, 0, 3] },
  "E":  { frets: [0, 2, 2, 1, 0, 0],       fingers: [0, 2, 3, 1, 0, 0] },
  "F":  { frets: [1, 1, 2, 3, 3, 1],       fingers: [1, 1, 2, 3, 4, 1] },
  "C":  { frets: [null, 3, 2, 0, 1, 0],    fingers: [null, 3, 2, 0, 1, 0] },
  "B":  { frets: [null, 2, 4, 4, 4, 2],    fingers: [null, 1, 3, 3, 3, 1] },
  "F#": { frets: [2, 4, 4, 3, 2, 2],       fingers: [1, 3, 4, 2, 1, 1] },
  "C#": { frets: [null, 4, 6, 6, 6, 4],    fingers: [null, 1, 3, 3, 3, 1] },
  "D#": {frets:   [null, 6, 8, 8, 8, 6],   fingers: [null, 1, 3, 3, 3, 1] },
  "G#": {frets:   [4, 6, 6, 5, 4, 4],      fingers: [1, 3, 4, 2, 1, 1] },
  "A#": {frets:   [null, 1, 3, 3, 3, 1],   fingers: [null, 1, 3, 3, 3, 1] }
}

const STRINGS = 6
const FRETS = 4
const WIDTH = 220
const HEIGHT = 200
const PAD_LEFT = 20
const PAD_RIGHT = 36
const PAD_TOP = 16
const PAD_BOTTOM = 16
const GRID_W = WIDTH - PAD_LEFT - PAD_RIGHT
const GRID_H = HEIGHT - PAD_TOP - PAD_BOTTOM
const STRING_GAP = GRID_W / (STRINGS - 1)
const FRET_GAP = GRID_H / (FRETS - 1)
const DOT_R = 14

export default function ChordDiagram({ chord }) {
  const chordData = CHORD_DICT[chord]
  if (!chordData) return <div style={{ color: '#888', padding: 8 }}>?</div>

  const { frets, fingers } = chordData

  const nonZeroFrets = frets.filter(f => f !== null && f !== 0)
  const lowestFret = Math.min(...nonZeroFrets)
  const startFret = lowestFret < 4 ? 1 : lowestFret

  const barreCount = fingers.filter(f => f === 1).length
  const barreFret = barreCount > 1 ? frets[fingers.indexOf(1)] : null
  const barreFirst = barreFret !== null ? fingers.indexOf(1) : null
  const barreLast = barreFret !== null ? fingers.lastIndexOf(1) : null

  const sx = (i) => PAD_LEFT + i * STRING_GAP
  const fy = (f) => PAD_TOP + ((f - startFret) / (FRETS - 1)) * GRID_H

  return (
    <svg
      width={WIDTH}
      height={HEIGHT + 24}
      viewBox={`0 0 ${WIDTH} ${HEIGHT + 24}`}
      style={{ display: 'block' }}
    >
      {/* Fret offset label */}
      {startFret > 1 && (
        <text
          x={WIDTH - 4}
          y={PAD_TOP + 6}
          textAnchor="end"
          fontSize={13}
          fill="#e8d5a3"
          fontFamily="'Courier New', monospace"
        >
          {startFret}fr
        </text>
      )}

      {/* Nut (thick top bar) — only when at position 1 */}
      {startFret === 1 && (
        <rect
          x={PAD_LEFT}
          y={PAD_TOP - 5}
          width={GRID_W}
          height={6}
          rx={2}
          fill="#e8d5a3"
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: FRETS }).map((_, i) => (
        <line
          key={i}
          x1={PAD_LEFT}
          y1={PAD_TOP + i * FRET_GAP}
          x2={PAD_LEFT + GRID_W}
          y2={PAD_TOP + i * FRET_GAP}
          stroke="#444"
          strokeWidth={1.5}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: STRINGS }).map((_, i) => (
        <line
          key={i}
          x1={sx(i)}
          y1={PAD_TOP}
          x2={sx(i)}
          y2={PAD_TOP + GRID_H}
          stroke="#555"
          strokeWidth={1 + (STRINGS - 1 - i) * 0.3}
        />
      ))}

      {/* x / o indicators */}
      {frets.map((fret, i) => {
        const label = fret === null ? '×' : fret === 0 ? 'o' : null
        if (!label) return null
        return (
          <text
            key={i}
            x={sx(i)}
            y={PAD_TOP - 10}
            textAnchor="middle"
            fontSize={14}
            fill={fret === null ? '#e05c5c' : '#7ecf8e'}
            fontFamily="'Courier New', monospace"
            fontWeight="bold"
          >
            {label}
          </text>
        )
      })}

      {/* Barre bar */}
      {barreFret !== null && (() => {
        const x1 = sx(barreFirst)
        const x2 = sx(barreLast)
        const y = fy(barreFret)
        return (
          <g key="barre">
            <rect
              x={x1 - DOT_R}
              y={y - DOT_R}
              width={x2 - x1 + DOT_R * 2}
              height={DOT_R * 2}
              rx={DOT_R}
              fill="#e8d5a3"
            />
            <text
              x={(x1 + x2) / 2}
              y={y + 5}
              textAnchor="middle"
              fontSize={13}
              fill="#1a1a2e"
              fontWeight="bold"
              fontFamily="'Courier New', monospace"
            >
              1
            </text>
          </g>
        )
      })()}

      {/* Finger dots */}
      {frets.map((fret, i) => {
        if (fret === null || fret === 0) return null
        if (barreFret !== null && fingers[i] === 1) return null
        const x = sx(i)
        const y = fy(fret)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={DOT_R} fill="#e8d5a3" />
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize={13}
              fill="#1a1a2e"
              fontWeight="bold"
              fontFamily="'Courier New', monospace"
            >
              {fingers[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
