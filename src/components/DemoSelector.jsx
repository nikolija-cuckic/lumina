export default function DemoSelector({ patients, onSelect }) {
  if (!patients.length) {
    return (
      <p style={{ fontSize: 13, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: '20px 0' }}>
        Nema dostupnih demo pacijenata.
      </p>
    )
  }

  return (
    <>
      <style>{`
        .demo-card-btn:hover { background-color: #2E6BE6 !important; color: #FFFFFF !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {patients.map(p => (
          <div
            key={p.patient_id}
            style={{
              backgroundColor: '#FAFBFF',
              border: '1px solid #EEF3FD',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#0F1C35',
                fontFamily: "'IBM Plex Mono', monospace",
                marginBottom: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {p.patient_id}
              </p>
              <p style={{ fontSize: 12, color: '#5A6A8A', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                {p.n_measurements} merenja · praćenje {p.max_week} ned.
              </p>
            </div>
            <button
              className="demo-card-btn"
              onClick={() => onSelect(p.patient_id)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: '#EEF3FD',
                color: '#2E6BE6',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background-color 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              Učitaj
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
