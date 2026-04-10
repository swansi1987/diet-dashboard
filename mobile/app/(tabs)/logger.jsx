import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

function today() {
  return new Date().toISOString().split('T')[0]
}

function FoodItem({ entry, onDelete }) {
  return (
    <TouchableOpacity style={styles.foodItem} onLongPress={() => onDelete(entry.id)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.foodName}>{entry.food_name}</Text>
        <Text style={styles.foodMacros}>
          {Math.round(entry.calories)} kcal · P {Math.round(entry.protein_g)}g · C {Math.round(entry.carbs_g)}g · F {Math.round(entry.fat_g)}g
        </Text>
      </View>
      <Text style={styles.serving}>{entry.serving_size}{entry.serving_unit}</Text>
    </TouchableOpacity>
  )
}

function AddFoodModal({ visible, meal, onClose, onAdded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [serving, setServing] = useState('100')

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await client.get(`/food-database?q=${encodeURIComponent(query)}`)
      setResults(data.foods || [])
    } catch {
      Alert.alert('Error', 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function addFood(food) {
    const servingAmt = parseFloat(serving) || 100
    const scale = servingAmt / 100
    try {
      await client.post('/daily-logs/entry', {
        date: today(),
        meal_type: meal.toLowerCase(),
        food_id: food.id,
        food_name: food.name,
        serving_size: servingAmt,
        serving_unit: food.serving_unit || 'g',
        calories: (food.calories_per_100g || 0) * scale,
        protein_g: (food.protein_g || 0) * scale,
        carbs_g: (food.carbs_g || 0) * scale,
        fat_g: (food.fat_g || 0) * scale,
      })
      onAdded()
      onClose()
    } catch (err) {
      Alert.alert('Error', err.message)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add to {meal}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search food..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={search}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servingRow}>
          <Text style={styles.servingLabel}>Serving (g):</Text>
          <TextInput
            style={styles.servingInput}
            value={serving}
            onChangeText={setServing}
            keyboardType="numeric"
          />
        </View>

        {searching
          ? <ActivityIndicator color="#6366f1" style={{ marginTop: 24 }} />
          : (
            <ScrollView>
              {results.map(food => (
                <TouchableOpacity key={food.id} style={styles.resultItem} onPress={() => addFood(food)}>
                  <Text style={styles.resultName}>{food.name}</Text>
                  <Text style={styles.resultMacros}>
                    {Math.round(food.calories_per_100g)} kcal / 100g
                  </Text>
                </TouchableOpacity>
              ))}
              {results.length === 0 && query && !searching && (
                <Text style={styles.noResults}>No results. Try a different term.</Text>
              )}
            </ScrollView>
          )
        }
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function LoggerScreen() {
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(null) // meal name string

  const loadLog = useCallback(() => {
    setLoading(true)
    client.get(`/daily-logs/${today()}`)
      .then(data => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadLog() }, [loadLog])

  async function deleteEntry(id) {
    Alert.alert('Remove', 'Remove this food entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await client.delete(`/daily-logs/entry/${id}`)
            loadLog()
          } catch (err) {
            Alert.alert('Error', err.message)
          }
        }
      }
    ])
  }

  const byMeal = (meal) => entries.filter(e => e.meal_type === meal.toLowerCase())

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Food Log</Text>
      <Text style={styles.date}>{today()}</Text>

      {loading
        ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {MEALS.map(meal => {
              const mealEntries = byMeal(meal)
              const mealCals = mealEntries.reduce((s, e) => s + (e.calories || 0), 0)
              return (
                <View key={meal} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{meal}</Text>
                    <Text style={styles.mealCals}>{Math.round(mealCals)} kcal</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(meal)}>
                      <Text style={styles.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                  {mealEntries.map(entry => (
                    <FoodItem key={entry.id} entry={entry} onDelete={deleteEntry} />
                  ))}
                  {mealEntries.length === 0 && (
                    <Text style={styles.emptyMeal}>No food logged</Text>
                  )}
                </View>
              )
            })}
          </ScrollView>
        )
      }

      {addModal && (
        <AddFoodModal
          visible={true}
          meal={addModal}
          onClose={() => setAddModal(null)}
          onAdded={loadLog}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  heading: { fontSize: 28, fontWeight: '700', color: '#f1f5f9', paddingHorizontal: 20, paddingTop: 16 },
  date: { fontSize: 14, color: '#64748b', paddingHorizontal: 20, marginBottom: 16 },
  scroll: { padding: 16 },
  mealSection: { marginBottom: 20 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealTitle: { fontSize: 16, fontWeight: '600', color: '#e2e8f0', flex: 1 },
  mealCals: { fontSize: 13, color: '#64748b', marginRight: 12 },
  addBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 13 },
  foodItem: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodName: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  foodMacros: { color: '#64748b', fontSize: 12, marginTop: 2 },
  serving: { color: '#94a3b8', fontSize: 13 },
  emptyMeal: { color: '#475569', fontSize: 13, paddingLeft: 4 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  closeBtn: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  searchRow: { flexDirection: 'row', padding: 16, gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#f1f5f9', borderWidth: 1, borderColor: '#334155' },
  searchBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  servingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  servingLabel: { color: '#94a3b8', fontSize: 14 },
  servingInput: { backgroundColor: '#1e293b', borderRadius: 8, padding: 8, color: '#f1f5f9', width: 80, borderWidth: 1, borderColor: '#334155', textAlign: 'center' },
  resultItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  resultName: { color: '#f1f5f9', fontSize: 15 },
  resultMacros: { color: '#64748b', fontSize: 12, marginTop: 2 },
  noResults: { color: '#475569', textAlign: 'center', marginTop: 32 },
})
