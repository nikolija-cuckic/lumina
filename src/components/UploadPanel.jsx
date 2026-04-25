import { useState, useRef } from 'react'

const th = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  color: '#5A6A8A',
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid #EEF3FD',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const td = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  color: '#0F1C35',
  padding: '6px 8px',
  borderBottom: '1px solid #EEF3FD',
}

const inputCss = {
  flex: 1,
  height: 36,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid #C8DCFA',
  fontSize: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  color: '#0F1C35',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  minWidth: 0,
}

export default function UploadPanel({ onPredict, isLoading }) {
  const [file, setFile]                 = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [weekInput, setWeekInput]       = useState('')
  const [volInput, setVolInput]         = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [fileError, setFileError]       = useState(null)
  const [runHover, setRunHover]         = useState(false)
  const inputRef                        = useRef(null)

  function isValidFile(f) {
    return f && (f.name.endsWith('.nii') || f.name.endsWith('.nii.gz'))
  }

  function applyFile(f) {
    if (!isValidFile(f)) {
      setFileError('Fajl mora biti u .nii ili .nii.gz formatu.')
      setFile(null)
      return
    }
    setFileError(null)
    setFile(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) applyFile(e.dataTransfer.files[0])
  }

  function handleAddRow() {
    const week   = parseFloat(weekInput)
    const volume = parseFloat(volInput)
    if (isNaN(week) || isNaN(volume) || volume <= 0) return
    setMeasurements(prev => [...prev, { week, volume }])
    setWeekInput('')
    setVolInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAddRow()
  }

  const canPredict = measurements.length >= 2 && !isLoading

  return (
    <>
      <style>{`
        @keyframes run-shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* ── Otpremanje snimka ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#2E6BE6' : '#C8DCFA'}`,
          borderRadius: 8,
          padding: '18px 14px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#EEF3FD' : '#FAFBFF',
          boxShadow: dragOver ? '0 0 0 4px rgba(46,107,230,0.10)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".nii,.nii.gz"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) applyFile(e.target.files[0]) }}
        />
        <p style={{
          fontSize: 13,
          fontWeight: 500,
          color: file ? '#1A9E6A' : '#2E6BE6',
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: file ? 0 : 3,
        }}>
          {file ? file.name : 'Prevuci .nii / .nii.gz fajl ovde'}
        </p>
        {!file && (
          <p style={{ fontSize: 11, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            ili klikni da odabereš fajl
          </p>
        )}
      </div>

      {fileError && (
        <p style={{ fontSize: 12, color: '#C93B3B', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
          {fileError}
        </p>
      )}

      {/* ── Separator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
        <div style={{ flex: 1, height: 1, backgroundColor: '#EEF3FD' }} />
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#5A6A8A',
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: '0.02em',
        }}>
          ili
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: '#EEF3FD' }} />
      </div>

      {/* ── Ručni unos merenja ── */}
      {measurements.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={th}>Nedelja</th>
              <th style={th}>Zapremina (cm³)</th>
              <th style={{ ...th, width: 28, padding: '6px 4px' }} />
            </tr>
          </thead>
          <tbody>
            {measurements.map((m, i) => (
              <tr key={i}>
                <td style={td}>{m.week}</td>
                <td style={td}>{m.volume.toFixed(2)}</td>
                <td style={{ ...td, padding: '4px', textAlign: 'center' }}>
                  <button
                    onClick={() => setMeasurements(prev => prev.filter((_, j) => j !== i))}
                    style={{ color: '#C93B3B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                    title="Ukloni"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          type="number"
          value={weekInput}
          onChange={e => setWeekInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ned."
          min="0"
          style={inputCss}
        />
        <input
          type="number"
          value={volInput}
          onChange={e => setVolInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="cm³"
          step="0.01"
          min="0"
          style={inputCss}
        />
        <button
          onClick={handleAddRow}
          disabled={!weekInput || !volInput}
          style={{
            flexShrink: 0,
            padding: '0 10px',
            height: 36,
            borderRadius: 8,
            backgroundColor: weekInput && volInput ? '#EEF3FD' : '#F5F7FA',
            color: weekInput && volInput ? '#2E6BE6' : '#A0AFCC',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: weekInput && volInput ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s',
          }}
        >
          + Dodaj merenje
        </button>
      </div>

      <button
        onClick={() => canPredict && onPredict(file, measurements)}
        disabled={!canPredict}
        onMouseEnter={() => setRunHover(true)}
        onMouseLeave={() => setRunHover(false)}
        style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 8,
          background: canPredict && runHover
            ? 'linear-gradient(90deg, #2E6BE6, #5BA4F5, #2E6BE6)'
            : canPredict ? '#2E6BE6' : '#C8DCFA',
          backgroundSize: '200% 200%',
          animation: canPredict && runHover ? 'run-shimmer 1.8s ease infinite' : 'none',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          border: 'none',
          cursor: canPredict ? 'pointer' : 'not-allowed',
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: '-0.2px',
          transition: 'background-color 0.2s',
        }}
      >
        {isLoading ? 'Pokrećem...' : 'Pokreni predikciju'}
      </button>

      {measurements.length === 1 && (
        <p style={{ fontSize: 11, color: '#5A6A8A', marginTop: 6, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          Potrebna su najmanje 2 merenja za predikciju.
        </p>
      )}
    </>
  )
}
