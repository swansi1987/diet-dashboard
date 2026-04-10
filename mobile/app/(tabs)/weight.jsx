import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function WeightScreen() {
  const insets = useSafeAreaInsets()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const loadLogs = useCallback(() => {
    client.get('/weight-log')
      .then(data => setLogs(data.entries || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  async function logWeight() {
    const kg = parseFloat(weight)
    if (!kg || kg <= 0) return Alert.alert('Error', 'Enter a valid weight')
    setSaving(true)
    try {
      await client.post('/weight-log', { date: today(), weight_kg: kg })
      setWeight('')
      loadLogs()
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteLog(id) {
    Alert.alert('Delete', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await client.delete(`/weight-log/${id}`)
            loadLogs()
          } catch (err) {
            Alert.alert('Error', err.message)
          }
        }
      }
    ])
  }

  const latest = logs[0]

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.heading}>Weight Log</Text>

      {latest && (
        <View style={styles.latestCard}>
          <Text style={styles.latestLabel}>Current</Text>
          <Text style={styles.latestValue}>{latest.weight_kg} kg</Text>
          <Text style={styles.latestDate}>{latest.date}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Weight in kg"
          placeholderTextColor="#64748b"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.logBtn} onPress={logWeight} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.logBtnText}>Log</Text>
          }
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.sectionTitle}>History</Text>
            {logs.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={styles.logItem}
                onLongPress={() => deleteLog(entry.id)}
              >
                <Text style={styles.logDate}>{entry.date}</Text>
                <Text style={styles.logWeight}>{entry.weight_kg} kg</Text>
              </TouchableOpacity>
            ))}
            {logs.length === 0 && (
              <Text style={styles.empty}>No weight logged yet.</Text>
            )}
          </ScrollView>
        )
      }
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  heading: { fontSize: 28, fontWeight: '700', color: '#f1f5f9', paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  latestCard: { marginHorizontal: 20, backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  latestLabel: { color: '#64748b', fontSize: 13 },
  latestValue: { fontSize: 48, fontWeight: '700', color: '#6366f1', marginVertical: 4 },
  latestDate: { color: '#94a3b8', fontSize: 13 },
  inputRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    color: '#f1f5f9', fontSize: 16, borderWidth: 1, borderColor: '#334155',
  },
  logBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginBottom: 12 },
  logItem: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  logDate: { color: '#94a3b8', fontSize: 14 },
  logWeight: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  empty: { color: '#475569', textAlign: 'center', marginTop: 32 },
})
