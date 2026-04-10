export default function ProteinGauge({ currentG, weightKg, size = 180 }) {
  const GOAL = 1.6  // g/kg
  const MAX = 3.2   // g/kg
  const ratio = weightKg ? currentG / weightKg : 0
  const percent = Math.min(ratio / MAX, 1)

  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) - 20
  const startAngle = -210
  const endAngle = 30
  const totalArc = endAngle - startAngle

  function polarToXY(angleDeg, radius) {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  function arcPath(startDeg, endDeg, radius) {
    const s = polarToXY(startDeg, radius)
    const e = polarToXY(endDeg, radius)
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const fillEnd = startAngle + totalArc * percent
  const goalAngle = startAngle + totalArc * (GOAL / MAX)

  const color = ratio < GOAL ? '#f59e0b' : ratio < MAX ? '#10b981' : '#06b6d4'

  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Track */}
      <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="#1e293b" strokeWidth={16} strokeLinecap="round" />
      {/* Fill */}
      {percent > 0 && (
        <path d={arcPath(startAngle, fillEnd, r)} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" />
      )}
      {/* Goal marker */}
      {(() => {
        const pt = polarToXY(goalAngle, r)
        return <circle cx={pt.x} cy={pt.y} r={5} fill="#64748b" />
      })()}

      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize={28} fontWeight="bold">
        {ratio.toFixed(1)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize={11}>
        g/kg body weight
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#475569" fontSize={10}>
        Goal: {GOAL} g/kg
      </text>
    </svg>
  )
}
