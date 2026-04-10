import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { RDA, MICRO_COLORS } from '../../utils/constants.js'

export default function MicroBarChart({ totals }) {
  const data = Object.entries(RDA).map(([key, rda]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    key,
    actual: +(totals[key] || 0).toFixed(1),
    rda,
    percent: Math.min(Math.round(((totals[key] || 0) / rda) * 100), 150),
    color: MICRO_COLORS[key],
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v}%`} domain={[0, 110]} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
          formatter={(v, n, p) => [`${p.payload.actual}mg / ${p.payload.rda}mg (${v}%)`, p.payload.name]}
          labelStyle={{ color: '#e2e8f0' }}
        />
        <ReferenceLine y={100} stroke="#334155" strokeDasharray="4 4" label={{ value: 'RDA', position: 'right', fill: '#475569', fontSize: 10 }} />
        <Bar dataKey="percent" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
