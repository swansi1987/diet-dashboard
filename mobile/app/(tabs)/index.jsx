import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'

function today() {
  return new Date().toISOString().split('T')[0]
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
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

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  )
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [logsData, profileData] = await Promise.all([
        client.get(`/daily-logs?date=${today()}`),
        client.get('/profile').catch(() => ({})),
      ])
      setEntries(Array.isArray(logsData) ? logsData : [])
      setProfile(profileData || {})
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  // Only count consumed entries for totals
  const consumed = entries.filter(e => e.consumed)
  const totalCals   = consumed.reduce((s, e) => s + (+e.calories || 0), 0)
  const totalProtein = consumed.reduce((s, e) => s + (+e.protein || 0), 0)
  const totalCarbs   = consumed.reduce((s, e) => s + (+e.carbs || 0), 0)
  const totalFat     = consumed.reduce((s, e) => s + (+e.fats || 0), 0)

  const calGoal = 2000 // default; profile doesn't store calorie_goal in current schema

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Today</Text>
      <Text style={styles.date}>{todayLabel()}</Text>

      {loading
        ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          >
            {/* Calorie progress */}
            <View style={styles.calCard}>
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>Calories</Text>
                <Text style={styles.calGoal}>{Math.round(totalCals)} / {calGoal} kcal</Text>
              </View>
              <ProgressBar value={totalCals} max={calGoal} color="#f59e0b" />
              <Text style={styles.calPct}>{Math.round((totalCals / calGoal) * 100)}% of goal</Text>
            </View>

            {/* Macro grid */}
            <Text style={styles.sectionTitle}>Macros</Text>
            <View style={styles.grid}>
              <StatCard label="Protein"  value={Math.round(totalProtein)} unit="g"    color="#6366f1" />
              <StatCard label="Carbs"    value={Math.round(totalCarbs)}   unit="g"    color="#10b981" />
              <StatCard label="Fat"      value={Math.round(totalFat)}     unit="g"    color="#ef4444" />
              <StatCard label="Meals"    value={entries.length}            unit="items" color="#f59e0b" />
            </View>

            {/* Recent meals */}
            {entries.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Today's Food</Text>
                {entries.slice(0, 8).map(e => (
                  <View key={e.id} style={styles.mealRow}>
                    <Text style={styles.mealName} numberOfLines={1}>{e.food_name}</Text>
                    <Text style={styles.mealCal}>{Math.round(+e.calories || 0)} kcal</Text>
                  </View>
                ))}
                {entries.length > 8 && (
                  <Text style={styles.more}>+{entries.length - 8} more…</Text>
                )}
              </>
            )}

            {entries.length === 0 && (
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
  heading:   { fontSize: 28, fontWeight: '700', color: '#f1f5f9', paddingHorizontal: 20, paddingTop: 16 },
  date:      { fontSize: 14, color: '#64748b', paddingHorizontal: 20, marginBottom: 16 },
  scroll:    { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginBottom: 12, marginTop: 20 },

  calCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 4 },
  calRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  calLabel: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
  calGoal:  { fontSize: 14, color: '#94a3b8' },
  calPct:   { fontSize: 12, color: '#64748b', marginTop: 6 },
  progressTrack: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },

  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:  { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, width: '47%' },
  cardLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: '700' },
  cardUnit:  { fontSize: 12, color: '#94a3b8' },

  mealRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  mealName: { color: '#e2e8f0', fontSize: 14, flex: 1, marginRight: 8 },
  mealCal:  { color: '#94a3b8', fontSize: 13 },
  more:      { color: '#475569', fontSize: 13, marginTop: 8, textAlign: 'center' },

  empty:     { marginTop: 48, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  emptyHint: { color: '#475569', fontSize: 13, marginTop: 4 },
})
