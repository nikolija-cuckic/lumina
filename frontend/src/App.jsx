import { useState } from 'react'

// ─────────────────────────────────────────────────────────
// MOCK_RESPONSE — jedina tačka promene za backend integraciju
// Oblik mora tačno da odgovara PredictionResponse iz schemas.py
// ─────────────────────────────────────────────────────────

const MOCK_RESPONSE = {
  traffic_light: 'yellow',
  n_mc_samples: 200,
  parameters: {
    alpha: {
      mean: 0.21,
      std: 0.04,
      label: 'Brzina rasta',
      interpretation: 'Umerena brzina rasta',
    },
    K: {
      mean: 5.84,
      std: 0.91,
      label: 'Maksimalni kapacitet',
      interpretation: 'Tumor neće preći ~5.8 cm³ bez intervencije',
    },
    beta: {
      mean: 0.19,
      std: 0.06,
      label: 'Efekat terapije',
      interpretation: 'Slab efekat terapije — razmotriti promenu tretmana',
    },
  },
  timepoints: [
    {
      week: 0,
      observed: 2.31,
      predicted_mean: 2.31,
      ci: {
        '50': { lower: 2.25, upper: 2.37 },
        '70': { lower: 2.20, upper: 2.42 },
        '80': { lower: 2.16, upper: 2.46 },
        '90': { lower: 2.10, upper: 2.52 },
        '95': { lower: 2.05, upper: 2.57 },
      },
    },
    {
      week: 4,
      observed: 2.87,
      predicted_mean: 2.79,
      ci: {
        '50': { lower: 2.71, upper: 2.87 },
        '70': { lower: 2.63, upper: 2.95 },
        '80': { lower: 2.56, upper: 3.02 },
        '90': { lower: 2.46, upper: 3.12 },
        '95': { lower: 2.38, upper: 3.20 },
      },
    },
    {
      week: 8,
      observed: 3.45,
      predicted_mean: 3.31,
      ci: {
        '50': { lower: 3.20, upper: 3.42 },
        '70': { lower: 3.10, upper: 3.52 },
        '80': { lower: 3.01, upper: 3.61 },
        '90': { lower: 2.88, upper: 3.74 },
        '95': { lower: 2.77, upper: 3.85 },
      },
    },
    {
      week: 12,
      observed: 3.21,
      predicted_mean: 3.74,
      ci: {
        '50': { lower: 3.61, upper: 3.88 },
        '70': { lower: 3.50, upper: 3.99 },
        '80': { lower: 3.40, upper: 4.09 },
        '90': { lower: 3.24, upper: 4.25 },
        '95': { lower: 3.10, upper: 4.39 },
      },
    },
    {
      week: 16,
      observed: null,
      predicted_mean: 4.08,
      ci: {
        '50': { lower: 3.91, upper: 4.26 },
        '70': { lower: 3.74, upper: 4.44 },
        '80': { lower: 3.61, upper: 4.59 },
        '90': { lower: 3.41, upper: 4.81 },
        '95': { lower: 3.24, upper: 5.02 },
      },
    },
    {
      week: 20,
      observed: null,
      predicted_mean: 4.35,
      ci: {
        '50': { lower: 4.15, upper: 4.56 },
        '70': { lower: 3.95, upper: 4.76 },
        '80': { lower: 3.78, upper: 4.93 },
        '90': { lower: 3.54, upper: 5.17 },
        '95': { lower: 3.33, upper: 5.38 },
      },
    },
    {
      week: 24,
      observed: null,
      predicted_mean: 4.57,
      ci: {
        '50': { lower: 4.34, upper: 4.81 },
        '70': { lower: 4.11, upper: 5.04 },
        '80': { lower: 3.91, upper: 5.23 },
        '90': { lower: 3.63, upper: 5.51 },
        '95': { lower: 3.39, upper: 5.75 },
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────
// Demo patients mock — mirrors GET /demo response
// ─────────────────────────────────────────────────────────

const MOCK_DEMO_PATIENTS = [
  { patient_id: 'LUMIERE_042', n_measurements: 4, max_week: 12, initial_volume: 2.31 },
  { patient_id: 'LUMIERE_017', n_measurements: 6, max_week: 20, initial_volume: 1.87 },
  { patient_id: 'LUMIERE_089', n_measurements: 5, max_week: 16, initial_volume: 3.12 },
  { patient_id: 'LUMIERE_031', n_measurements: 4, max_week: 12, initial_volume: 4.05 },
  { patient_id: 'LUMIERE_056', n_measurements: 7, max_week: 24, initial_volume: 1.44 },
  { patient_id: 'LUMIERE_073', n_measurements: 5, max_week: 16, initial_volume: 2.76 },
]

// ─────────────────────────────────────────────────────────
// Components (created separately)
// ─────────────────────────────────────────────────────────

import DemoSelector    from './components/DemoSelector'
import UploadPanel     from './components/UploadPanel'
import TrafficLight    from './components/TrafficLight'
import ParameterCards  from './components/ParameterCards'
import TrajectoryChart from './components/TrajectoryChart'
import CITable         from './components/CITable'

// ─────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────

export default function App() {
  // ── Core prediction state — exact shape required ──
  const [predictionData, setPredictionData] = useState(MOCK_RESPONSE)
  const [isLoading, setIsLoading]           = useState(false)
  const [error, setError]                   = useState(null)
  const [activeCILevels, setActiveCILevels] = useState([70, 90])

  // ── UI state ──
  const [activeTab, setActiveTab]           = useState('upload')  // 'upload' | 'demo'
  const [patientId, setPatientId]           = useState('LUMIERE_042')
  const [measurements, setMeasurements]     = useState([])

  // ─────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────

  async function handleRunPrediction(file) {
    setIsLoading(true)
    setError(null)
    try {
      const { predictFromUpload, predictFromFeatures } = await import('./api/client')
      let result
      if (file) {
        result = await predictFromUpload(file, measurements)
      } else {
        if (measurements.length < 2) {
          setError('Potrebna su najmanje 2 merenja za predikciju.')
          return
        }
        result = await predictFromFeatures(measurements)
      }
      setPredictionData(result)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Došlo je do greške. Pokušajte ponovo.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLoadDemo(demoPatientId) {
    setIsLoading(true)
    setError(null)
    setPatientId(demoPatientId)
    try {
      const { getDemoPatient } = await import('./api/client')
      const result = await getDemoPatient(demoPatientId)
      setPredictionData(result)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Došlo je do greške. Pokušajte ponovo.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddMeasurement(measurement) {
    setMeasurements(prev => [...prev, measurement])
  }

  function handleToggleCI(level) {
    setActiveCILevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    )
  }

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: '#FAFBFF', fontFamily: "'DM Sans', sans-serif", color: '#0F1C35' }}
    >
      {/* ── Left sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col"
        style={{
          width: 320,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 16px rgba(46, 107, 230, 0.08)',
          padding: '28px 24px',
          overflowY: 'auto',
        }}
      >
        {/* Logo + tagline */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <img src="/lumina_icon.svg" alt="Lumina" style={{ width: 28, height: 28 }} />
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>Lumina</span>
          </div>
          <p style={{ fontSize: 13, color: '#5A6A8A' }}>Jasnoća kroz neizvesnost</p>
        </div>

        {/* Patient loader */}
        <div className="mb-6">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#5A6A8A', textTransform: 'uppercase', marginBottom: 12 }}>
            Učitaj pacijenta
          </p>

          {/* Tabs */}
          <div className="flex mb-4" style={{ borderBottom: '1px solid #EEF3FD' }}>
            {[
              { key: 'upload', label: 'Otpremi snimak' },
              { key: 'demo',   label: 'Demo pacijent'  },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  paddingBottom: 10,
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? '#2E6BE6' : '#5A6A8A',
                  borderBottom: activeTab === tab.key ? '2px solid #2E6BE6' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #2E6BE6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'upload' ? (
            <UploadPanel
              measurements={measurements}
              onAddMeasurement={handleAddMeasurement}
              onRunPrediction={handleRunPrediction}
              isLoading={isLoading}
            />
          ) : (
            <DemoSelector
              patients={MOCK_DEMO_PATIENTS}
              activePatientId={patientId}
              onLoad={handleLoadDemo}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Traffic light legend */}
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #EEF3FD' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#5A6A8A', textTransform: 'uppercase', marginBottom: 10 }}>
            Interpretacija
          </p>
          {[
            { color: '#1A9E6A', bg: '#E8F7F2', label: 'Terapija efikasna'    },
            { color: '#D4891A', bg: '#FDF3E3', label: 'Umeren odgovor'        },
            { color: '#C93B3B', bg: '#FDEAEA', label: 'Terapija ne pomaže'   },
          ].map(({ color, bg, label }) => (
            <div key={label} className="flex items-center gap-2 mb-2">
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#5A6A8A' }}>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ marginLeft: 320, flex: 1, padding: '32px 40px', minWidth: 0 }}>
        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-3"
            style={{ backgroundColor: '#FDEAEA', color: '#C93B3B', fontSize: 14 }}
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : predictionData ? (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span style={{ fontSize: 12, color: '#5A6A8A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Pacijent
                </span>
                <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginTop: 2 }}>
                  {patientId}
                </h1>
              </div>
              <TrafficLight status={predictionData.traffic_light} />
            </div>

            {/* Row 1 — Parameter cards */}
            <ParameterCards parameters={predictionData.parameters} />

            {/* Row 2 — Chart */}
            <TrajectoryChart
              timepoints={predictionData.timepoints}
              activeCILevels={activeCILevels}
              onToggleCI={handleToggleCI}
            />

            {/* Row 3 — CI Table */}
            <CITable
              timepoints={predictionData.timepoints}
              activeCILevels={activeCILevels}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Inline micro-components (not data-driven, no separate file needed)
// ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center" style={{ height: '70vh' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', marginBottom: 24,
        background: 'radial-gradient(circle, #C8DCFA 0%, #EEF3FD 60%, transparent 100%)',
      }} />
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F1C35', marginBottom: 8 }}>
        Otpremite snimak ili odaberite demo pacijenta
      </h2>
      <p style={{ fontSize: 14, color: '#5A6A8A' }}>
        Predviđanje će biti prikazano ovde
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  const shimmer = {
    background: 'linear-gradient(90deg, #EEF3FD 25%, #DDEAFB 50%, #EEF3FD 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 12,
  }
  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
      `}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...shimmer, height: 32, width: 200, marginBottom: 8 }} />
      </div>
      <div className="flex gap-4 mb-6">
        {[0,1,2].map(i => <div key={i} style={{ ...shimmer, height: 120, flex: 1 }} />)}
      </div>
      <div style={{ ...shimmer, height: 380, marginBottom: 24 }} />
      <div style={{ ...shimmer, height: 200 }} />
      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#5A6A8A' }}>
        Pokrećem B-BINN inferencu (200 MC uzoraka)...
      </p>
    </>
  )
}
