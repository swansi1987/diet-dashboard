import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'

function today() {
  return new Date().toISOString().split('T')[0]
}

function StatCard({ label, value, unit, color }) {
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardUnit}>{unit}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get(`/daily-logs/${today()}`)
      .then(data => setLog(data))
      .catch(() => setLog(null))
      .finally(() => setLoading(false))
  }, [])

  const totalCals = log?.entries?.reduce((s, e) => s + (e.calories || 0), 0) ?? 0
  const totalProtein = log?.entries?.reduce((s, e) => s + (e.protein_g || 0), 0) ?? 0
  const totalCarbs = log?.entries?.reduce((s, e) => s + (e.carbs_g || 0), 0) ?? 0
  const totalFat = log?.entries?.reduce((s, e) => s + (e.fat_g || 0), 0) ?? 0

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Today</Text>
      <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

      {loading
        ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.sectionTitle}>Nutrition Summary</Text>
            <View style={styles.grid}>
              <StatCard label="Calories" value={Math.round(totalCals)} unit="kcal" color="#f59e0b" />
              <StatCard label="Protein" value={Math.round(totalProtein)} unit="g" color="#6366f1" />
              <StatCard label="Carbs" value={Math.round(totalCarbs)} unit="g" color="#10b981" />
              <StatCard label="Fat" value={Math.round(totalFat)} unit="g" color="#ef4444" />
            </View>

            {(!log?.entries || log.entries.length === 0) && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No food logged today.</Text>
                <Text style={styles.emptyHint}>Go to the Log tab to add meals.</Text>
              </View>
            )}
          </ScrollView>
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  heading: { fontSize: 28, fontWeight: '700', color: '#f1f5f9', paddingHorizontal: 20, paddingTop: 16 },
  date: { fontSize: 14, color: '#64748b', paddingHorizontal: 20, marginBottom: 16 },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '47%',
  },
  cardLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: '700' },
  cardUnit: { fontSize: 12, color: '#94a3b8' },
  empty: { marginTop: 48, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  emptyHint: { color: '#475569', fontSize: 13, marginTop: 4 },
})
