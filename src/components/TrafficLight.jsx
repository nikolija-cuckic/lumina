const STATUS_CONFIG = {
  green:  { color: '#1A9E6A', bg: '#E8F7F2', label: 'Terapija efikasna'  },
  yellow: { color: '#D4891A', bg: '#FDF3E3', label: 'Umeren odgovor'     },
  red:    { color: '#C93B3B', bg: '#FDEAEA', label: 'Terapija ne pomaže' },
}

export default function TrafficLight({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.yellow

  return (
    <>
      <style>{`
        @keyframes tl-pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${cfg.color}55; }
          50%       { box-shadow: 0 0 0 10px ${cfg.color}00; }
        }
      `}</style>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 20px',
          borderRadius: 8,
          backgroundColor: cfg.bg,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: cfg.color,
            flexShrink: 0,
            animation: 'tl-pulse 2.4s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: cfg.color,
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '-0.2px',
          }}
        >
          {cfg.label}
        </span>
      </div>
    </>
  )
}
