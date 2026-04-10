import { getSettingValue } from '../routes/settings.js'
import * as gemini from './geminiAdapter.js'
import * as openai from './openaiAdapter.js'
import * as claude from './claudeAdapter.js'

const ADAPTERS = { gemini, openai, claude }
const KEY_MAP = {
  gemini: 'gemini_api_key',
  openai: 'openai_api_key',
  claude: 'claude_api_key',
}

export async function getAdapter(userId) {
  const provider = (await getSettingValue(userId, 'preferred_ai_provider')) || 'gemini'
  const apiKey = await getSettingValue(userId, KEY_MAP[provider])
  if (!apiKey) {
    const err = new Error(`API key for ${provider} not configured. Go to Settings to add your key.`)
    err.statusCode = 400
    throw err
  }
  const adapter = ADAPTERS[provider]
  if (!adapter) {
    const err = new Error(`Unknown AI provider: ${provider}`)
    err.statusCode = 400
    throw err
  }
  return { adapter, apiKey, provider }
}

export async function runAI(userId, method, ...args) {
  const { adapter, apiKey } = await getAdapter(userId)
  return adapter[method](apiKey, ...args)
}
