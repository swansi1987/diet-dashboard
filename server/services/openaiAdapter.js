import OpenAI from 'openai'

function safeParseJSON(text) {
  const cleaned = text.replace(/```json?\n?|```/g, '').trim()
  const start = cleaned.search(/[[\{]/)
  if (start === -1) throw new Error('No JSON found in response')
  return JSON.parse(cleaned.slice(start))
}

function getClient(apiKey) {
  return new OpenAI({ apiKey })
}

async function chat(apiKey, messages, jsonMode = true) {
  const client = getClient(apiKey)
  const params = {
    model: 'gpt-4o',
    messages,
  }
  if (jsonMode) params.response_format = { type: 'json_object' }
  const res = await client.chat.completions.create(params)
  return res.choices[0].message.content
}

export async function quickAddParse(apiKey, text) {
  const content = await chat(apiKey, [
    { role: 'system', content: 'You are a nutrition parser. Return only valid JSON.' },
    { role: 'user', content: `Parse this meal description into a JSON array with key "items".
Schema per item: {"foodName":string,"quantity":number,"unit":string,"calories":number,"protein":number,"carbs":number,"fats":number,"mealType":string,"isJunkMeal":boolean}
Valid mealType: breakfast, lunch, dinner, snacks, pre-workout, post-workout
Input: "${text}"` }
  ])
  const parsed = safeParseJSON(content)
  return parsed.items || parsed
}

export async function photoMealAnalyze(apiKey, base64, mimeType) {
  const client = getClient(apiKey)
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this food image. Return JSON with key "items", array of: {"foodName":string,"estimatedQuantityG":number,"calories":number,"protein":number,"carbs":number,"fats":number,"isJunkMeal":boolean}' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
      ]
    }]
  })
  const parsed = safeParseJSON(res.choices[0].message.content)
  return parsed.items || parsed
}

export async function enrichFoodByName(apiKey, foodName) {
  const content = await chat(apiKey, [
    { role: 'system', content: 'You are a nutrition database. Return only valid JSON.' },
    { role: 'user', content: `Nutritional info per 100g for "${foodName}". Return JSON: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}` }
  ])
  return safeParseJSON(content)
}

export async function enrichFoodByImage(apiKey, base64, mimeType) {
  const client = getClient(apiKey)
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Identify this food and estimate nutritional content per 100g. Return JSON: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
      ]
    }]
  })
  return safeParseJSON(res.choices[0].message.content)
}

export async function updateMinerals(apiKey, foodItems) {
  const names = foodItems.map(f => `id:${f.id} ${f.name}`).join(', ')
  const content = await chat(apiKey, [
    { role: 'system', content: 'You are a nutrition database. Return only valid JSON.' },
    { role: 'user', content: `Estimate micronutrients per 100g for: ${names}. Return JSON with key "items": [{"id":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}]` }
  ])
  const parsed = safeParseJSON(content)
  return parsed.items || parsed
}

export async function generateMealPlan(apiKey, profile, todayTotals) {
  const client = getClient(apiKey)
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a nutrition coach. Create meal plans in markdown format.' },
      { role: 'user', content: `Create a next-day meal plan for:
Age: ${profile.age || 'unknown'}, Weight: ${profile.weight || 'unknown'}kg, Height: ${profile.height || 'unknown'}cm
Today's intake: ${todayTotals.calories}kcal, P:${todayTotals.protein}g C:${todayTotals.carbs}g F:${todayTotals.fats}g
Use markdown with ## Breakfast, ## Lunch, ## Dinner headings.` }
    ]
  })
  return res.choices[0].message.content
}

export async function generateRecipe(apiKey, ingredients) {
  const client = getClient(apiKey)
  const list = ingredients.map(i => i.name).join(', ')
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a chef and nutritionist. Create recipes in markdown.' },
      { role: 'user', content: `Create a healthy recipe using: ${list}
Format: ## Recipe Name, **Servings**, ### Ingredients, ### Instructions, ### Nutrition per serving` }
    ]
  })
  return res.choices[0].message.content
}
