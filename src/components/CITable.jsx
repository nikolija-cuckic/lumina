// CI column background: lighter as level increases (50% darkest → 95% lightest)
const CI_COL_BG = {
  50: 'rgba(143, 184, 244, 0.18)',
  70: 'rgba(174, 203, 247, 0.15)',
  80: 'rgba(200, 220, 250, 0.13)',
  90: 'rgba(221, 234, 251, 0.10)',
  95: 'rgba(238, 243, 253, 0.08)',
}

const thBase = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: 11,
  color: '#5A6A8A',
  textAlign: 'left',
  padding: '10px 16px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #EEF3FD',
}

const tdBase = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  color: '#0F1C35',
  padding: '9px 16px',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #EEF3FD',
}

export default function CITable({ timepoints, activeCILevels }) {
  // Columns sorted ascending: 50 → 95 (tighter → wider, darker → lighter bg)
  const sortedLevels = [...activeCILevels].sort((a, b) => a - b)

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      boxShadow: '0 2px 16px rgba(46, 107, 230, 0.08)',
      overflow: 'auto',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: '#EEF3FD' }}>
            <th style={thBase}>Nedelja</th>
            <th style={thBase}>Izmereno</th>
            <th style={thBase}>Srednja vrednost</th>
            {sortedLevels.map(level => (
              <th
                key={level}
                style={{ ...thBase, backgroundColor: CI_COL_BG[level] ?? 'transparent' }}
              >
                {level}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timepoints.map(t => {
            const isFuture = t.observed === null
            const rowBg    = isFuture ? '#F5F7FA' : '#FFFFFF'
            return (
              <tr key={t.week} style={{ backgroundColor: rowBg }}>
                <td style={{ ...tdBase, fontWeight: 600 }}>{t.week}</td>
                <td style={{ ...tdBase, color: isFuture ? '#5A6A8A' : '#2E6BE6' }}>
                  {t.observed !== null ? t.observed.toFixed(2) : '—'}
                </td>
                <td style={tdBase}>{t.predicted_mean.toFixed(2)}</td>
                {sortedLevels.map(level => {
                  const band = t.ci[String(level)]
                  return (
                    <td
                      key={level}
                      style={{ ...tdBase, backgroundColor: CI_COL_BG[level] ?? 'transparent' }}
                    >
                      {band ? `${band.lower.toFixed(2)} – ${band.upper.toFixed(2)}` : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
