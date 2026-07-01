import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Timer } from 'lucide-react'
import './RestTimer.css'

const PRESETS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '120s', value: 120 },
]

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch { /* ignore */ }
}

export default function RestTimer({ onTimerEnd }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef(null)
  const [showTimer, setShowTimer] = useState(false)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearTimer()
    setIsRunning(false)
    setTimeLeft(0)
    setTotalTime(0)
  }, [clearTimer])

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearTimer()
            setIsRunning(false)
            playBeep()
            if (onTimerEnd) onTimerEnd()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearTimer()
  }, [isRunning, timeLeft, clearTimer, onTimerEnd])

  function startPreset(seconds) {
    resetTimer()
    setTimeLeft(seconds)
    setTotalTime(seconds)
    setIsRunning(true)
    setShowTimer(true)
  }

  function togglePause() {
    if (timeLeft > 0) {
      setIsRunning(p => !p)
    }
  }

  function handleReset() {
    resetTimer()
    setShowTimer(false)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const progress = totalTime > 0 ? (timeLeft / totalTime) * CIRCUMFERENCE : CIRCUMFERENCE

  return (
    <div className="rt-container">
      <div className="rt-header">
        <Timer size={18} />
        <span>Rest Timer</span>
      </div>

      <div className="rt-presets">
        {PRESETS.map(p => (
          <button
            key={p.value}
            className={`rt-preset-btn ${totalTime === p.value && isRunning ? 'rt-active' : ''}`}
            onClick={() => startPreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showTimer && (
        <div className="rt-timer-display">
          <svg className="rt-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={RADIUS} className="rt-ring-bg" />
            <circle
              cx="60" cy="60" r={RADIUS}
              className="rt-ring-fill"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - progress}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <div className="rt-time">{display}</div>
        </div>
      )}

      {showTimer && (
        <div className="rt-controls">
          <button className="rt-ctrl-btn" onClick={togglePause} disabled={timeLeft === 0}>
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="rt-ctrl-btn" onClick={handleReset}>
            <RotateCcw size={18} />
          </button>
        </div>
      )}

      {!showTimer && (
        <div className="rt-idle">
          <p>Select a rest duration</p>
        </div>
      )}
    </div>
  )
}
