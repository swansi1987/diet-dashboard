import Anthropic from '@anthropic-ai/sdk'

function safeParseJSON(text) {
  const cleaned = text.replace(/```json?\n?|```/g, '').trim()
  const start = cleaned.search(/[[\{]/)
  if (start === -1) throw new Error('No JSON found in response')
  return JSON.parse(cleaned.slice(start))
}

function getClient(apiKey) {
  return new Anthropic({ apiKey })
}

async function message(apiKey, content, system) {
  const client = getClient(apiKey)
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: system || 'You are a nutrition assistant. Return only valid JSON when asked.',
    messages: [{ role: 'user', content }]
  })
  return res.content[0].text
}

export async function quickAddParse(apiKey, text) {
  const content = await message(apiKey,
    `Parse this meal description into a JSON array. Return ONLY minified JSON, no markdown.
Schema: [{"foodName":string,"quantity":number,"unit":string,"calories":number,"protein":number,"carbs":number,"fats":number,"mealType":string,"isJunkMeal":boolean}]
Valid mealType: breakfast, lunch, dinner, snacks, pre-workout, post-workout
Input: "${text}"`
  )
  return safeParseJSON(content)
}

export async function photoMealAnalyze(apiKey, base64, mimeType) {
  const client = getClient(apiKey)
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 }
        },
        {
          type: 'text',
          text: 'Analyze this food image. Return ONLY minified JSON array, no markdown.\nSchema: [{"foodName":string,"estimatedQuantityG":number,"calories":number,"protein":number,"carbs":number,"fats":number,"isJunkMeal":boolean}]'
        }
      ]
    }]
  })
  return safeParseJSON(res.content[0].text)
}

export async function enrichFoodByName(apiKey, foodName) {
  const content = await message(apiKey,
    `Nutritional info per 100g for "${foodName}". Return ONLY minified JSON object, no markdown.
Schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}`
  )
  return safeParseJSON(content)
}

export async function enrichFoodByImage(apiKey, base64, mimeType) {
  const client = getClient(apiKey)
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 }
        },
        {
          type: 'text',
          text: 'Identify this food and estimate nutritional content per 100g. Return ONLY minified JSON, no markdown.\nSchema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}'
        }
      ]
    }]
  })
  return safeParseJSON(res.content[0].text)
}

export async function updateMinerals(apiKey, foodItems) {
  const names = foodItems.map(f => `id:${f.id} ${f.name}`).join(', ')
  const content = await message(apiKey,
    `Estimate micronutrients per 100g for these foods: ${names}
Return ONLY minified JSON array, no markdown.
Schema: [{"id":number,"calcium":number,"iron":number,"magnesium":number,"potassium":number,"zinc":number}]`
  )
  return safeParseJSON(content)
}

export async function generateMealPlan(apiKey, profile, todayTotals) {
  const client = getClient(apiKey)
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are a nutrition coach. Create detailed, healthy meal plans.',
    messages: [{
      role: 'user',
      content: `Create a personalized next-day meal plan.
User: Age ${profile.age || 'unknown'}, Weight ${profile.weight || 'unknown'}kg, Height ${profile.height || 'unknown'}cm
Today's intake: ${todayTotals.calories}kcal, P:${todayTotals.protein}g C:${todayTotals.carbs}g F:${todayTotals.fats}g
Format in markdown with ## Breakfast, ## Lunch, ## Dinner headings, food items as bullets with calories.`
    }]
  })
  return res.content[0].text
}

export async function generateRecipe(apiKey, ingredients) {
  const client = getClient(apiKey)
  const list = ingredients.map(i => i.name).join(', ')
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are a chef and nutritionist. Create detailed recipes in markdown.',
    messages: [{
      role: 'user',
      content: `Create a healthy recipe using: ${list}
Format: ## Recipe Name, **Servings** and **Est. Calories**, ### Ingredients (with quantities), ### Instructions (numbered), ### Nutrition per serving`
    }]
  })
  return res.content[0].text
}
