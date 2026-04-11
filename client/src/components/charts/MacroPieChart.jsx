import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MACRO_COLORS } from '../../utils/constants.js'

export default function MacroPieChart({ protein, carbs, fats }) {
  const data = [
    { name: 'Protein', value: protein, color: MACRO_COLORS.protein },
    { name: 'Carbs', value: carbs, color: MACRO_COLORS.carbs },
    { name: 'Fats', value: fats, color: MACRO_COLORS.fats },
  ].filter(d => d.value > 0)

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No data</div>
  )

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#ffffff', fontSize: '12px' }}
          itemStyle={{ color: '#ffffff' }}
          formatter={(v, name) => {
            const total = protein + carbs + fats;
            const percent = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
            return [`${v}g (${percent}%)`, name];
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
