const PARAM_META = {
  alpha: {
    unit: 'α',
    icon: (
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
        <path d="M3 16 Q7 13 11 9 Q15 5 19 3" stroke="#2E6BE6" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M15 3 L19 3 L19 7" stroke="#2E6BE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  K: {
    unit: 'K',
    icon: (
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
        <line x1="2" y1="6" x2="20" y2="6" stroke="#2E6BE6" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2.5" />
        <path d="M4 18 Q8 14 11 10 Q14 7 17 6.5" stroke="#2E6BE6" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  beta: {
    unit: 'β',
    icon: (
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
        <path
          d="M7 19 L7 4 Q7 3 8 3 L13 3 Q16 3 16 6.5 Q16 9 13 9.5 Q16.5 10 16.5 13.5 Q16.5 19 12 19 Z"
          stroke="#2E6BE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </svg>
    ),
  },
}

export default function ParameterCards({ parameters }) {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {Object.entries(parameters).map(([key, param], index) => {
          const meta = PARAM_META[key] ?? { unit: key, icon: null }
          return (
            <div
              key={key}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: '14px 18px 12px',
                boxShadow: '0 2px 16px rgba(46, 107, 230, 0.08)',
                opacity: 0,
                animation: 'fadeInUp 0.35s ease forwards',
                animationDelay: `${index * 90}ms`,
              }}
            >
              {/* Label row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#5A6A8A',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}>
                  {param.label}
                </p>
                <div style={{ opacity: 0.6 }}>{meta.icon}</div>
              </div>

              {/* Value row: unit symbol + number + ±std all inline */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: '#2E6BE6',
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                }}>
                  {meta.unit}
                </span>
                <span style={{
                  fontSize: 28,
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: '#0F1C35',
                  letterSpacing: '-1px',
                  lineHeight: 1,
                }}>
                  {param.mean.toFixed(2)}
                </span>
                <span style={{
                  fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: '#5A6A8A',
                }}>
                  ±{param.std.toFixed(2)}
                </span>
              </div>

              {/* Interpretation */}
              <p style={{
                fontSize: 11,
                color: '#5A6A8A',
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1.5,
                borderTop: '1px solid #EEF3FD',
                paddingTop: 9,
                margin: 0,
              }}>
                {param.interpretation}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}
