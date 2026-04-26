import Plot from 'react-plotly.js'

const CI_COLORS = {
  95: '#EEF3FD',
  90: '#DDEAFB',
  80: '#C8DCFA',
  70: '#AECBF7',
  50: '#8FB8F4',
}

export default function TrajectoryChart({ timepoints, activeCILevels }) {
  const weeks        = timepoints.map(t => t.week)
  const sortedLevels = [...activeCILevels].sort((a, b) => b - a) // outermost first: 95→50

  const traces = []

  // CI bands — iterate, never hardcode one trace per level
  for (const level of sortedLevels) {
    const key    = String(level)
    const lowers = timepoints.map(t => t.ci[key]?.lower ?? null)
    const uppers = timepoints.map(t => t.ci[key]?.upper ?? null)

    // Invisible lower bound anchors the fill
    traces.push({
      x: weeks,
      y: lowers,
      type: 'scatter',
      mode: 'lines',
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip',
      name: `${level}% dolnja`,
    })

    // Upper bound fills down to the previous trace
    traces.push({
      x: weeks,
      y: uppers,
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: CI_COLORS[level],
      line: { width: 0 },
      showlegend: false,
      hoverinfo: 'skip',
      name: `${level}%`,
    })
  }

  // Mean prediction line
  traces.push({
    x: weeks,
    y: timepoints.map(t => t.predicted_mean),
    type: 'scatter',
    mode: 'lines',
    line: { color: '#2E6BE6', width: 2 },
    name: 'Srednja vrednost',
    hovertemplate: 'Ned. %{x} — %{y:.3f}<extra>Srednja vrednost</extra>',
  })

  // Observed points — white circle, blue border
  const obs = timepoints.filter(t => t.observed !== null)
  traces.push({
    x: obs.map(t => t.week),
    y: obs.map(t => t.observed),
    type: 'scatter',
    mode: 'markers',
    marker: {
      size: 10,
      color: '#FFFFFF',
      line: { color: '#2E6BE6', width: 2.5 },
      symbol: 'circle',
    },
    name: 'Izmereno',
    hovertemplate: 'Ned. %{x} — %{y:.3f}<extra>Izmereno</extra>',
  })

  const layout = {
    title: {
      text: 'Trajektorija rasta tumora',
      font: { family: "'DM Sans', sans-serif", size: 14, color: '#0F1C35' },
      x: 0.01,
      xanchor: 'left',
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#FAFBFF',
    margin: { t: 48, r: 20, b: 52, l: 60 },
    font: { family: "'DM Sans', sans-serif", color: '#0F1C35' },
    xaxis: {
      title: {
        text: 'Nedelje',
        font: { color: '#5A6A8A', size: 12 },
        standoff: 10,
      },
      gridcolor: '#EEF3FD',
      linecolor: '#EEF3FD',
      tickfont: { family: "'IBM Plex Mono', monospace", size: 11, color: '#5A6A8A' },
      zeroline: false,
    },
    yaxis: {
      title: {
        text: 'Normalizovani volumen (V/V₀)',
        font: { color: '#5A6A8A', size: 12 },
        standoff: 10,
      },
      gridcolor: '#EEF3FD',
      linecolor: '#EEF3FD',
      tickfont: { family: "'IBM Plex Mono', monospace", size: 11, color: '#5A6A8A' },
      zeroline: false,
    },
    showlegend: false,
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: '#FFFFFF',
      bordercolor: '#EEF3FD',
      font: { family: "'DM Sans', sans-serif", size: 12, color: '#0F1C35' },
    },
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      boxShadow: '0 2px 16px rgba(46, 107, 230, 0.08)',
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      <Plot
        data={traces}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 380 }}
        useResizeHandler
      />
    </div>
  )
}
