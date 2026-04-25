import { useState, useEffect } from 'react'
import { usePrediction }    from './hooks/usePrediction'
import { listDemoPatients } from './api/client'
import TrafficLight    from './components/TrafficLight'
import ParameterCards  from './components/ParameterCards'
import UploadPanel     from './components/UploadPanel'
import TrajectoryChart from './components/TrajectoryChart'
import CITable         from './components/CITable'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK_RESPONSE — jedino mesto sa hardcoded podacima.
// Oblik mora biti identičan PredictionResponse iz backend/schemas.py.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RESPONSE = {
  traffic_light: 'yellow',
  n_mc_samples:  200,
  parameters: {
    alpha: {
      mean:           0.21,
      std:            0.04,
      label:          'Brzina rasta',
      interpretation: 'Umerena brzina rasta',
    },
    K: {
      mean:           5.84,
      std:            0.91,
      label:          'Maksimalni kapacitet',
      interpretation: 'Tumor neće preći ~5.8 cm³ bez intervencije',
    },
    beta: {
      mean:           0.19,
      std:            0.06,
      label:          'Efekat terapije',
      interpretation: 'Slab efekat terapije — razmotriti promenu tretmana',
    },
  },
  timepoints: [
    {
      week: 0, observed: 2.31, predicted_mean: 2.31,
      ci: {
        '50': { lower: 2.25, upper: 2.37 }, '70': { lower: 2.20, upper: 2.42 },
        '80': { lower: 2.16, upper: 2.46 }, '90': { lower: 2.10, upper: 2.52 },
        '95': { lower: 2.05, upper: 2.57 },
      },
    },
    {
      week: 4, observed: 2.87, predicted_mean: 2.79,
      ci: {
        '50': { lower: 2.70, upper: 2.88 }, '70': { lower: 2.62, upper: 2.96 },
        '80': { lower: 2.55, upper: 3.03 }, '90': { lower: 2.45, upper: 3.13 },
        '95': { lower: 2.36, upper: 3.22 },
      },
    },
    {
      week: 8, observed: 3.45, predicted_mean: 3.31,
      ci: {
        '50': { lower: 3.19, upper: 3.43 }, '70': { lower: 3.09, upper: 3.53 },
        '80': { lower: 3.00, upper: 3.62 }, '90': { lower: 2.87, upper: 3.75 },
        '95': { lower: 2.76, upper: 3.86 },
      },
    },
    {
      week: 12, observed: 3.21, predicted_mean: 3.74,
      ci: {
        '50': { lower: 3.60, upper: 3.88 }, '70': { lower: 3.49, upper: 3.99 },
        '80': { lower: 3.39, upper: 4.09 }, '90': { lower: 3.23, upper: 4.25 },
        '95': { lower: 3.09, upper: 4.39 },
      },
    },
    {
      week: 16, observed: null, predicted_mean: 4.08,
      ci: {
        '50': { lower: 3.91, upper: 4.26 }, '70': { lower: 3.74, upper: 4.44 },
        '80': { lower: 3.61, upper: 4.59 }, '90': { lower: 3.41, upper: 4.81 },
        '95': { lower: 3.24, upper: 5.02 },
      },
    },
    {
      week: 20, observed: null, predicted_mean: 4.35,
      ci: {
        '50': { lower: 4.14, upper: 4.56 }, '70': { lower: 3.93, upper: 4.77 },
        '80': { lower: 3.76, upper: 4.94 }, '90': { lower: 3.51, upper: 5.19 },
        '95': { lower: 3.29, upper: 5.41 },
      },
    },
    {
      week: 24, observed: null, predicted_mean: 4.57,
      ci: {
        '50': { lower: 4.32, upper: 4.82 }, '70': { lower: 4.07, upper: 5.07 },
        '80': { lower: 3.85, upper: 5.29 }, '90': { lower: 3.56, upper: 5.58 },
        '95': { lower: 3.30, upper: 5.84 },
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

// Fallback lista pacijenata — koristi se dok backend nije dostupan.
// Oblik odgovara DemoPatient iz backend/schemas.py.
const MOCK_DEMO_PATIENTS = [
  { patient_id: 'LUMIERE_042', n_measurements: 4, max_week: 12, initial_volume: 2.31 },
  { patient_id: 'LUMIERE_017', n_measurements: 6, max_week: 20, initial_volume: 1.87 },
  { patient_id: 'LUMIERE_089', n_measurements: 5, max_week: 16, initial_volume: 3.12 },
  { patient_id: 'LUMIERE_031', n_measurements: 4, max_week: 12, initial_volume: 4.05 },
  { patient_id: 'LUMIERE_056', n_measurements: 7, max_week: 24, initial_volume: 1.44 },
  { patient_id: 'LUMIERE_073', n_measurements: 5, max_week: 16, initial_volume: 2.76 },
]

const CI_LEVELS_ALL = [50, 70, 80, 90, 95]

const LEGEND_ITEMS = [
  { color: '#1A9E6A', label: 'Terapija efikasna'  },
  { color: '#D4891A', label: 'Umeren odgovor'      },
  { color: '#C93B3B', label: 'Terapija ne pomaže'  },
]

export default function App() {
  // ── Core state ────────────────────────────────────────────────────────────
  const {
    predictionData,
    isLoading,
    error,
    activeCILevels,
    setActiveCILevels,
    runPrediction,
    loadDemo,
  } = usePrediction(MOCK_RESPONSE)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [patientId,    setPatientId]    = useState('LUMIERE_042')
  const [demoPatients, setDemoPatients] = useState(MOCK_DEMO_PATIENTS)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [modalPatient, setModalPatient] = useState(null)

  useEffect(() => {
    listDemoPatients()
      .then(setDemoPatients)
      .catch(() => {}) // backend nedostupan — ostaje MOCK_DEMO_PATIENTS
  }, [])

  // Close modal on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setModalPatient(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePredict(file, measurements) {
    runPrediction(measurements)
  }

  function handleToggleCI(level) {
    setActiveCILevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }

  function handleToggleAll() {
    setActiveCILevels(prev =>
      prev.length === CI_LEVELS_ALL.length ? [] : [...CI_LEVELS_ALL]
    )
  }

  const filteredPatients = demoPatients.filter(p =>
    p.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #FAFBFF; font-family: 'DM Sans', sans-serif; color: #0F1C35; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #EEF3FD; }
        ::-webkit-scrollbar-thumb { background: #C8DCFA; border-radius: 3px; }

        .ci-pill {
          padding: 4px 11px; border-radius: 4px; font-size: 12px;
          font-family: 'IBM Plex Mono', monospace; border: none;
          cursor: pointer; transition: background-color 0.15s, color 0.15s;
        }
        .patient-card {
          padding: 11px 14px; border-radius: 10px; border: 1px solid #EEF3FD;
          margin-bottom: 7px; cursor: pointer; background: #FAFBFF;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .patient-card:hover {
          border-color: #AECBF7;
          box-shadow: 0 2px 10px rgba(46, 107, 230, 0.10);
        }
        .search-input:focus { border-color: #2E6BE6 !important; }
        .modal-load-btn:hover { background-color: #2E6BE6 !important; color: #FFFFFF !important; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ═══════════════════ SIDEBAR ═══════════════════ */}
        <aside style={{
          width: 300,
          flexShrink: 0,
          position: 'fixed',
          top: 0, left: 0,
          height: '100vh',
          backgroundColor: '#FFFFFF',
          boxShadow: '2px 0 16px rgba(46, 107, 230, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          overflowY: 'auto',
        }}>

          {/* Logo */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #2E6BE6, #5BA4F5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2 L9 16 M5 6 L9 2 L13 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 10 Q3 13 5 16 L13 16 Q15 13 13 10 Z" fill="rgba(255,255,255,0.3)" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#0F1C35', letterSpacing: '-0.5px' }}>Lumina</span>
            </div>
            <p style={{ fontSize: 12, color: '#5A6A8A', paddingLeft: 40 }}>Jasnoća kroz neizvesnost</p>
          </div>

          {/* Section title */}
          <p style={{
            fontSize: 10, fontWeight: 600, color: '#5A6A8A',
            textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10,
          }}>
            Učitaj pacijenta
          </p>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="13" height="13" viewBox="0 0 14 14" fill="none"
            >
              <circle cx="6" cy="6" r="4.5" stroke="#5A6A8A" strokeWidth="1.5"/>
              <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#5A6A8A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pretraži pacijente..."
              style={{
                width: '100%', height: 34, padding: '0 10px 0 30px',
                borderRadius: 8, border: '1px solid #C8DCFA',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                color: '#0F1C35', backgroundColor: '#FAFBFF', outline: 'none',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          {/* Patient list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {demoPatients.length === 0 ? (
              <p style={{ fontSize: 12, color: '#5A6A8A', textAlign: 'center', padding: '16px 0', fontFamily: "'DM Sans', sans-serif" }}>
                Nema dostupnih pacijenata.
              </p>
            ) : filteredPatients.length === 0 ? (
              <p style={{ fontSize: 12, color: '#5A6A8A', textAlign: 'center', padding: '16px 0', fontFamily: "'DM Sans', sans-serif" }}>
                Nema rezultata.
              </p>
            ) : (
              filteredPatients.map(p => (
                <div
                  key={p.patient_id}
                  className="patient-card"
                  onClick={() => setModalPatient(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setModalPatient(p)}
                >
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: '#0F1C35',
                    fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.patient_id}
                  </p>
                  <p style={{ fontSize: 12, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif" }}>
                    {p.n_measurements} merenja · praćenje {p.max_week} ned.
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div style={{ paddingTop: 16, borderTop: '1px solid #EEF3FD', marginTop: 8 }}>
            <p style={{
              fontSize: 10, fontWeight: 600, color: '#5A6A8A',
              textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 9,
            }}>
              Interpretacija
            </p>
            {LEGEND_ITEMS.map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ═══════════════════ MAIN AREA ═══════════════════ */}
        <main style={{ marginLeft: 300, flex: 1, padding: '32px 36px 48px', minWidth: 0 }}>

          {error && (
            <div style={{
              backgroundColor: '#FDEAEA', color: '#C93B3B', borderRadius: 8,
              padding: '10px 16px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <LoadingSkeleton />
          ) : predictionData ? (
            <>
              {/* Top bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <p style={{
                    fontSize: 10, fontWeight: 600, color: '#5A6A8A',
                    textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3,
                  }}>
                    Pacijent
                  </p>
                  <h1 style={{
                    fontSize: 24, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                    color: '#0F1C35', letterSpacing: '-1px',
                  }}>
                    {patientId ?? '—'}
                  </h1>
                </div>
                <TrafficLight status={predictionData.traffic_light} />
              </div>

              {/* Parameter cards */}
              <ParameterCards parameters={predictionData.parameters} />

              {/* CI toggle + Chart */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#5A6A8A',
                    textTransform: 'uppercase', letterSpacing: '0.09em',
                  }}>
                    Intervali poverenja
                  </span>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {CI_LEVELS_ALL.map(level => (
                      <button
                        key={level}
                        className="ci-pill"
                        onClick={() => handleToggleCI(level)}
                        style={{
                          backgroundColor: activeCILevels.includes(level) ? '#2E6BE6' : '#EEF3FD',
                          color:           activeCILevels.includes(level) ? '#FFFFFF' : '#5A6A8A',
                          fontWeight:      activeCILevels.includes(level) ? 600 : 400,
                        }}
                      >
                        {level}%
                      </button>
                    ))}
                    <button
                      className="ci-pill"
                      onClick={handleToggleAll}
                      style={{
                        backgroundColor: activeCILevels.length === CI_LEVELS_ALL.length ? '#2E6BE6' : '#EEF3FD',
                        color:           activeCILevels.length === CI_LEVELS_ALL.length ? '#FFFFFF' : '#5A6A8A',
                        fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      SVI
                    </button>
                  </div>
                </div>
                <TrajectoryChart timepoints={predictionData.timepoints} activeCILevels={activeCILevels} />
              </div>

              {/* CI Table */}
              <CITable timepoints={predictionData.timepoints} activeCILevels={activeCILevels} />
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      {/* ═══════════════════ MODAL ═══════════════════ */}
      {modalPatient && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalPatient(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            backgroundColor: 'rgba(15, 28, 53, 0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 16,
            width: 460, maxHeight: '88vh', overflowY: 'auto',
            padding: '26px 28px',
            boxShadow: '0 16px 56px rgba(46, 107, 230, 0.20)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{
                  fontSize: 10, fontWeight: 600, color: '#5A6A8A',
                  textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3,
                }}>
                  Pacijent
                </p>
                <h2 style={{
                  fontSize: 18, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                  color: '#0F1C35', letterSpacing: '-0.5px', marginBottom: 3,
                }}>
                  {modalPatient.patient_id}
                </h2>
                <p style={{ fontSize: 12, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif" }}>
                  {modalPatient.n_measurements} merenja · praćenje {modalPatient.max_week} ned.
                </p>
              </div>
              <button
                onClick={() => setModalPatient(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#5A6A8A', fontSize: 22, lineHeight: 1, padding: '2px 6px',
                  borderRadius: 4, transition: 'color 0.15s',
                }}
              >
                ×
              </button>
            </div>

            {/* Upload panel (with "ili" separator built in) */}
            <UploadPanel
              onPredict={(file, measurements) => {
                const pid = modalPatient.patient_id
                setModalPatient(null)
                setPatientId(pid)
                handlePredict(file, measurements)
              }}
              isLoading={isLoading}
            />

            {/* Quick demo load */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: '#EEF3FD' }} />
              <span style={{ fontSize: 12, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif" }}>ili</span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#EEF3FD' }} />
            </div>
            <button
              className="modal-load-btn"
              onClick={() => {
                const pid = modalPatient.patient_id
                setModalPatient(null)
                setPatientId(pid)
                loadDemo(pid)
              }}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8,
                backgroundColor: '#EEF3FD', color: '#2E6BE6',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              Učitaj demo predikciju
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 16 }}>
      <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="38" fill="url(#lg)" />
        <defs>
          <radialGradient id="lg" cx="50%" cy="40%" r="60%">
            <stop offset="0%"   stopColor="#C8DCFA" />
            <stop offset="40%"  stopColor="#EEF3FD" />
            <stop offset="100%" stopColor="#FAFBFF" />
          </radialGradient>
        </defs>
        <line x1="40" y1="14" x2="40" y2="66" stroke="#2E6BE6" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        {[[-20,10],[-12,20],[12,20],[20,10]].map(([dx,dy],i) => (
          <line key={i} x1="40" y1="40" x2={40+dx} y2={40+dy}
            stroke="#5BA4F5" strokeWidth="1.5" strokeLinecap="round" opacity={0.35+i*0.1}/>
        ))}
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0F1C35', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
          Otpremite snimak ili odaberite demo pacijenta
        </p>
        <p style={{ fontSize: 13, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif" }}>
          Predviđanje će biti prikazano ovde
        </p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  const shimmer = {
    borderRadius: 12,
    background: 'linear-gradient(90deg, #EEF3FD 25%, #DDEAFB 50%, #EEF3FD 75%)',
    backgroundSize: '400% 100%',
    animation: 'skeleton 1.6s ease infinite',
  }
  return (
    <>
      <style>{`@keyframes skeleton { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div style={{ ...shimmer, width:180, height:34 }} />
        <div style={{ ...shimmer, width:150, height:38, borderRadius:8 }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[0,1,2].map(i => <div key={i} style={{ ...shimmer, height:96, animationDelay:`${i*80}ms` }} />)}
      </div>
      <div style={{ ...shimmer, height:380, marginBottom:20 }} />
      <div style={{ ...shimmer, height:150 }} />
      <p style={{ textAlign:'center', marginTop:14, fontSize:13, color:'#5A6A8A', fontFamily:"'DM Sans', sans-serif" }}>
        Pokrećem B-BINN inferencu (200 MC uzoraka)...
      </p>
    </>
  )
}
