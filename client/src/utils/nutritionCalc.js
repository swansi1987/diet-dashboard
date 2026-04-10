import { RDA } from './constants.js'

export function calcTotals(logs) {
  const consumed = logs.filter(l => l.consumed && !l.is_junk_meal)
  return {
    calories: round(consumed.reduce((s, l) => s + (+l.calories || 0), 0)),
    protein:  round(consumed.reduce((s, l) => s + (+l.protein || 0), 0)),
    carbs:    round(consumed.reduce((s, l) => s + (+l.carbs || 0), 0)),
    fats:     round(consumed.reduce((s, l) => s + (+l.fats || 0), 0)),
    calcium:  round(consumed.reduce((s, l) => s + (+l.calcium || 0), 0)),
    iron:     round(consumed.reduce((s, l) => s + (+l.iron || 0), 0)),
    magnesium:round(consumed.reduce((s, l) => s + (+l.magnesium || 0), 0)),
    potassium:round(consumed.reduce((s, l) => s + (+l.potassium || 0), 0)),
    zinc:     round(consumed.reduce((s, l) => s + (+l.zinc || 0), 0)),
  }
}

export function calcMacroPercents(totals) {
  const { protein, carbs, fats } = totals
  const totalCal = (protein * 4) + (carbs * 4) + (fats * 9)
  if (totalCal === 0) return { protein: 0, carbs: 0, fats: 0 }
  return {
    protein: round((protein * 4 / totalCal) * 100),
    carbs:   round((carbs * 4 / totalCal) * 100),
    fats:    round((fats * 9 / totalCal) * 100),
  }
}

export function calcRDAPercents(totals) {
  return Object.fromEntries(
    Object.entries(RDA).map(([key, rda]) => [
      key,
      Math.min(round((totals[key] / rda) * 100), 150)
    ])
  )
}

export function calcProteinPerKg(proteinG, weightKg) {
  if (!weightKg || weightKg === 0) return 0
  return round(proteinG / weightKg, 2)
}

export function scaleNutrition(food, quantity) {
  const scale = quantity / (food.base_quantity || 100)
  return {
    calories:  round((+food.calories || 0) * scale),
    protein:   round((+food.protein || 0) * scale),
    carbs:     round((+food.carbs || 0) * scale),
    fats:      round((+food.fats || 0) * scale),
    calcium:   round((+food.calcium || 0) * scale),
    iron:      round((+food.iron || 0) * scale),
    magnesium: round((+food.magnesium || 0) * scale),
    potassium: round((+food.potassium || 0) * scale),
    zinc:      round((+food.zinc || 0) * scale),
  }
}

function round(n, decimals = 1) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}
