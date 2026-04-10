import { GoogleGenerativeAI } from '@google/generative-ai'

function safeParseJSON(text) {
  const cleaned = text.replace(/```json?\n?|```/g, '').trim()
  const start = cleaned.search(/[[\{]/)
  if (start === -1) throw new Error('No JSON found in response')
  return JSON.parse(cleaned.slice(start))
}

function getModel(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })
}

export async function quickAddParse(apiKey, text) {
  const model = getModel(apiKey)
  const prompt = `You are a nutrition parser. Parse the following meal description.
Return ONLY a minified JSON array, no markdown, no explanation.
Schema: [{"foodName":string,"quantity":number,"unit":string,"calories":number,"protein":number,"carbs":number,"fats":number,"mealType":string,"isJunkMeal":boolean}]
Valid mealType values: breakfast, lunch, dinner, snacks, pre-workout, post-workout
Input: "${text}"`
  const result = await model.generateContent(prompt)
  return safeParseJSON(result.response.text())
}

export async function photoMealAnalyze(apiKey, base64, mimeType) {
  const model = getModel(apiKey)
  const prompt = `Analyze this food image and estimate its nutritional content.
Return ONLY a minified JSON array, no markdown, no explanation.
Schema: [{"foodName":string,"estimatedQuantityG":number,"calories":number,"protein":number,"carbs":number,"fats":number,"isJunkMeal":boolean}]`
  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64 } }
  ])
  return safeParseJSON(result.response.text())
}

export async function enrichFoodByName(apiKey, foodName) {
  const model = getModel(apiKey)
  const prompt = `Provide nutritional information per 100g for: "${foodName}"
Return ONLY a minified JSON object, no markdown.
Schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}`
  const result = await model.generateContent(prompt)
  return safeParseJSON(result.response.text())
}

export async function enrichFoodByImage(apiKey, base64, mimeType) {
  const model = getModel(apiKey)
  const prompt = `Identify this food/ingredient and estimate its nutritional content per 100g.
Return ONLY a minified JSON object, no markdown.
Schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}`
  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64 } }
  ])
  return safeParseJSON(result.response.text())
}

export async function updateMinerals(apiKey, foodItems) {
  const model = getModel(apiKey)
  const names = foodItems.map(f => f.name).join(', ')
  const prompt = `Estimate micronutrients (per 100g) for these foods: ${names}
Return ONLY a minified JSON array, no markdown.
Schema: [{"id":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}]
Use the same id values as provided: ${JSON.stringify(foodItems.map(f => ({ id: f.id, name: f.name })))}`
  const result = await model.generateContent(prompt)
  return safeParseJSON(result.response.text())
}

export async function generateMealPlan(apiKey, profile, todayTotals) {
  const model = getModel(apiKey)
  const prompt = `Create a personalized next-day meal plan.
User profile: Age ${profile.age || 'unknown'}, Weight ${profile.weight || 'unknown'}kg, Height ${profile.height || 'unknown'}cm
Today's intake: ${todayTotals.calories}kcal, Protein ${todayTotals.protein}g, Carbs ${todayTotals.carbs}g, Fats ${todayTotals.fats}g
Generate a balanced meal plan for tomorrow with Breakfast, Lunch, and Dinner.
Use markdown formatting with ## headings for each meal, bullet points for food items, and estimated calories.`
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateRecipe(apiKey, ingredients) {
  const model = getModel(apiKey)
  const ingredientList = ingredients.map(i => `${i.name}${i.base_quantity ? ` (per ${i.base_quantity}${i.unit})` : ''}`).join(', ')
  const prompt = `Create a healthy recipe using these ingredients: ${ingredientList}
Format the response in markdown with:
## Recipe Name
**Servings:** X | **Est. Calories per serving:** X kcal
### Ingredients
- list with quantities
### Instructions
1. numbered steps
### Nutrition per serving (estimated)
- macros`
  const result = await model.generateContent(prompt)
  return result.response.text()
}
