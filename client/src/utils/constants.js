export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks', 'pre-workout', 'post-workout']

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  'pre-workout': 'Pre-Workout',
  'post-workout': 'Post-Workout',
}

export const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snacks: '🍎',
  'pre-workout': '💪',
  'post-workout': '🔄',
}

// Daily Reference Values (RDA)
export const RDA = {
  calcium: 1000,   // mg
  iron: 18,        // mg
  magnesium: 400,  // mg
  potassium: 3500, // mg
  zinc: 11,        // mg
}

export const MICRO_COLORS = {
  calcium: '#06b6d4',
  iron: '#f59e0b',
  magnesium: '#8b5cf6',
  potassium: '#10b981',
  zinc: '#ef4444',
}

export const MACRO_COLORS = {
  protein: '#10b981',
  carbs: '#06b6d4',
  fats: '#f59e0b',
}

export const AI_PROVIDERS = [
  {
    value: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini 2.5 Flash',
    model: 'gemini-2.5-flash-preview-05-20',
    keyName: 'Google AI Studio key',
    keySource: 'aistudio.google.com',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o',
    model: 'gpt-4o',
    keyName: 'OpenAI Platform key',
    keySource: 'platform.openai.com/api-keys',
  },
  {
    value: 'claude',
    label: 'Claude',
    description: 'Claude Sonnet 4.6',
    model: 'claude-sonnet-4-6',
    keyName: 'Anthropic Console key',
    keySource: 'console.anthropic.com/settings/keys',
  },
]
