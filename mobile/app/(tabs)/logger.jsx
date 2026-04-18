import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'

const MEALS = [
  { key: 'breakfast',    label: 'Breakfast' },
  { key: 'lunch',        label: 'Lunch' },
  { key: 'dinner',       label: 'Dinner' },
  { key: 'snacks',       label: 'Snacks' },
  { key: 'pre-workout',  label: 'Pre-Workout' },
  { key: 'post-workout', label: 'Post-Workout' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

// ── Food Item row ──────────────────────────────────────────────────────────────
function FoodItem({ entry, onDelete }) {
  return (
    <TouchableOpacity
      style={[styles.foodItem, !entry.consumed && styles.foodItemUnchecked]}
      onLongPress={() => onDelete(entry.id)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.foodName}>{entry.food_name}</Text>
        <Text style={styles.foodMacros}>
          {Math.round(+entry.calories || 0)} kcal
          {' · '}P {(+entry.protein || 0).toFixed(1)}g
          {' · '}C {(+entry.carbs || 0).toFixed(1)}g
          {' · '}F {(+entry.fats || 0).toFixed(1)}g
        </Text>
      </View>
      <Text style={styles.serving}>{entry.quantity}g</Text>
    </TouchableOpacity>
  )
}

// ── Add Food Modal ─────────────────────────────────────────────────────────────
function AddFoodModal({ visible, mealKey, mealLabel, onClose, onAdded }) {
  const [tab, setTab] = useState('search') // 'search' | 'ai'
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [serving, setServing] = useState('100')

  // AI Quick Add
  const [aiText, setAiText]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  function reset() {
    setQuery(''); setResults([]); setServing('100'); setAiText('')
  }

  function handleClose() { reset(); onClose() }

  // Search food database
  async function doSearch() {
    const term = query.trim()
    if (!term) return
    setSearching(true)
    try {
      const data = await client.get(`/food-database?search=${encodeURIComponent(term)}`)
      setResults(Array.isArray(data) ? data : [])
    } catch {
      Alert.alert('Error', 'Search failed — check your connection')
    } finally {
      setSearching(false)
    }
  }

  // Log a food from search results
  async function addFood(food) {
    const qty = parseFloat(serving) || 100
    const scale = qty / (food.base_quantity || 100)
    try {
      await client.post('/daily-logs', {
        date:       today(),
        meal_type:  mealKey,
        food_id:    food.id,
        food_name:  food.name,
        brand_name: food.brand_name || null,
        quantity:   qty,
        calories:   Math.round((+food.calories || 0) * scale),
        protein:    +((+food.protein || 0) * scale).toFixed(1),
        carbs:      +((+food.carbs   || 0) * scale).toFixed(1),
        fats:       +((+food.fats    || 0) * scale).toFixed(1),
        consumed:   true,
      })
      reset()
      onAdded()
      onClose()
    } catch (err) {
      Alert.alert('Error', err.message)
    }
  }

  // AI Quick Add
  async function doAiAdd() {
    const text = aiText.trim()
    if (!text) return
    setAiLoading(true)
    try {
      const items = await client.post('/ai/quick-add', {
        text,
        date:      today(),
        meal_type: mealKey,
      })
      const list = Array.isArray(items) ? items : (items?.items || [])
      if (!list.length) {
        Alert.alert('No items', 'AI could not identify any food items.')
        return
      }
      // Log all identified items
      await Promise.all(list.map(item =>
        client.post('/daily-logs', {
          date:      today(),
          meal_type: mealKey,
          food_name: item.food_name || item.name,
          quantity:  item.quantity  || 100,
          calories:  Math.round(+item.calories || 0),
          protein:   +((+item.protein || 0).toFixed(1)),
          carbs:     +((+item.carbs   || 0).toFixed(1)),
          fats:      +((+item.fats    || 0).toFixed(1)),
          consumed:  true,
        })
      ))
      Alert.alert('Added!', `${list.length} item${list.length > 1 ? 's' : ''} added to ${mealLabel}.`)
      reset()
      onAdded()
      onClose()
    } catch (err) {
      Alert.alert('AI Error', err.message || 'Make sure your AI key is set in Settings.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add to {mealLabel}</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'search' && styles.tabBtnActive]}
            onPress={() => setTab('search')}
          >
            <Text style={[styles.tabBtnText, tab === 'search' && styles.tabBtnTextActive]}>🔍 Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'ai' && styles.tabBtnActive]}
            onPress={() => setTab('ai')}
          >
            <Text style={[styles.tabBtnText, tab === 'ai' && styles.tabBtnTextActive]}>✨ AI Quick Add</Text>
          </TouchableOpacity>
        </View>

        {tab === 'search' ? (
          <>
            {/* Search bar */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search food..."
                placeholderTextColor="#64748b"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={doSearch}
                returnKeyType="search"
                autoFocus
              />
              <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
                <Text style={styles.searchBtnText}>Go</Text>
              </TouchableOpacity>
            </View>

            {/* Serving size */}
            <View style={styles.servingRow}>
              <Text style={styles.servingLabel}>Serving (g):</Text>
              <TextInput
                style={styles.servingInput}
                value={serving}
                onChangeText={setServing}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Results */}
            {searching
              ? <ActivityIndicator color="#6366f1" style={{ marginTop: 24 }} />
              : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  {results.map(food => (
                    <TouchableOpacity key={food.id} style={styles.resultItem} onPress={() => addFood(food)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{food.name}</Text>
                        {food.brand_name ? <Text style={styles.resultBrand}>{food.brand_name}</Text> : null}
                      </View>
                      <Text style={styles.resultCal}>{food.calories} kcal/{food.base_quantity}{food.unit}</Text>
                    </TouchableOpacity>
                  ))}
                  {results.length === 0 && query.trim() !== '' && !searching && (
                    <Text style={styles.noResults}>No results. Try a different term.</Text>
                  )}
                </ScrollView>
              )
            }
          </>
        ) : (
          /* AI Quick Add tab */
          <View style={styles.aiSection}>
            <Text style={styles.aiHint}>
              Describe what you ate in natural language. AI will identify the foods and log them automatically.
            </Text>
            <TextInput
              style={styles.aiInput}
              placeholder={`e.g. "2 eggs and toast with butter"`}
              placeholderTextColor="#64748b"
              value={aiText}
              onChangeText={setAiText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.aiBtn, aiLoading && { opacity: 0.6 }]}
              onPress={doAiAdd}
              disabled={aiLoading}
            >
              {aiLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.aiBtnText}>✨ Log with AI</Text>
              }
            </TouchableOpacity>
            <Text style={styles.aiNote}>Requires an AI API key in Settings.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Logger Screen ──────────────────────────────────────────────────────────────
export default function LoggerScreen() {
  const insets = useSafeAreaInsets()
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addModal, setAddModal]   = useState(null) // { key, label }

  const loadLog = useCallback(async () => {
    try {
      const data = await client.get(`/daily-logs?date=${today()}`)
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadLog() }, [loadLog])

  const onRefresh = () => { setRefreshing(true); loadLog() }

  async function deleteEntry(id) {
    Alert.alert('Remove', 'Remove this food entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await client.delete(`/daily-logs/${id}`)
            loadLog()
          } catch (err) {
            Alert.alert('Error', err.message)
          }
        },
      },
    ])
  }

  const totalCals = entries.filter(e => e.consumed).reduce((s, e) => s + (+e.calories || 0), 0)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Food Log</Text>
        <Text style={styles.totalCal}>{Math.round(totalCals)} kcal</Text>
      </View>
      <Text style={styles.date}>{today()}</Text>

      {loading
        ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          >
            {MEALS.map(meal => {
              const mealEntries = entries.filter(e => e.meal_type === meal.key)
              const mealCals = mealEntries.filter(e => e.consumed).reduce((s, e) => s + (+e.calories || 0), 0)
              return (
                <View key={meal.key} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{meal.label}</Text>
                    {mealCals > 0 && <Text style={styles.mealCals}>{Math.round(mealCals)} kcal</Text>}
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => setAddModal({ key: meal.key, label: meal.label })}
                    >
                      <Text style={styles.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                  {mealEntries.map(entry => (
                    <FoodItem key={entry.id} entry={entry} onDelete={deleteEntry} />
                  ))}
                  {mealEntries.length === 0 && (
                    <Text style={styles.emptyMeal}>Nothing logged yet</Text>
                  )}
                </View>
              )
            })}
          </ScrollView>
        )
      }

      {addModal && (
        <AddFoodModal
          visible
          mealKey={addModal.key}
          mealLabel={addModal.label}
          onClose={() => setAddModal(null)}
          onAdded={loadLog}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 16 },
  heading:   { fontSize: 28, fontWeight: '700', color: '#f1f5f9' },
  totalCal:  { fontSize: 15, fontWeight: '600', color: '#f59e0b' },
  date:      { fontSize: 14, color: '#64748b', paddingHorizontal: 20, marginBottom: 12 },
  scroll:    { padding: 16, paddingBottom: 40 },

  mealSection: { marginBottom: 20 },
  mealHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealTitle:   { fontSize: 15, fontWeight: '600', color: '#e2e8f0', flex: 1 },
  mealCals:    { fontSize: 12, color: '#64748b', marginRight: 8 },
  addBtn:      { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#334155' },
  addBtnText:  { color: '#6366f1', fontWeight: '600', fontSize: 13 },

  foodItem: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  foodItemUnchecked: { opacity: 0.5 },
  foodName:   { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  foodMacros: { color: '#64748b', fontSize: 12, marginTop: 2 },
  serving:    { color: '#94a3b8', fontSize: 12 },
  emptyMeal:  { color: '#334155', fontSize: 13, paddingLeft: 4 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  closeBtn:       { color: '#6366f1', fontSize: 16, fontWeight: '600' },

  tabRow:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive:   { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabBtnText:     { color: '#64748b', fontSize: 14 },
  tabBtnTextActive: { color: '#6366f1', fontWeight: '600' },

  searchRow:   { flexDirection: 'row', padding: 16, gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#f1f5f9', borderWidth: 1, borderColor: '#334155' },
  searchBtn:   { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600' },

  servingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  servingLabel: { color: '#94a3b8', fontSize: 14 },
  servingInput: { backgroundColor: '#1e293b', borderRadius: 8, padding: 8, color: '#f1f5f9', width: 80, borderWidth: 1, borderColor: '#334155', textAlign: 'center' },

  resultItem:  { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  resultName:  { color: '#f1f5f9', fontSize: 15 },
  resultBrand: { color: '#64748b', fontSize: 12, marginTop: 2 },
  resultCal:   { color: '#6366f1', fontSize: 13, marginLeft: 8 },
  noResults:   { color: '#475569', textAlign: 'center', marginTop: 32 },

  // AI tab
  aiSection: { padding: 20, flex: 1 },
  aiHint:    { color: '#94a3b8', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  aiInput:   { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#f1f5f9', fontSize: 15, borderWidth: 1, borderColor: '#334155', minHeight: 100 },
  aiBtn:     { backgroundColor: '#6366f1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  aiBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  aiNote:    { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 12 },
})
