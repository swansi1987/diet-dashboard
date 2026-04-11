export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().split('T')[0]
}

export function todayISO() {
  return toISODate(new Date())
}

export function parseDate(dateStr) {
  if (!dateStr) return new Date(NaN)
  // Strip any time portion (handles both "2024-03-28" and "2024-03-28T00:00:00.000Z")
  const datePart = String(dateStr).split('T')[0]
  return new Date(datePart + 'T00:00:00Z')
}

export function formatDate(dateStr, options = {}) {
  if (!dateStr) return ''
  const d = parseDate(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', ...options })
}

export function formatDateShort(dateStr) {
  return formatDate(dateStr, { month: 'short', day: 'numeric' })
}

export function formatDateFull(dateStr) {
  return formatDate(dateStr, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

export function addDays(dateStr, days) {
  const d = parseDate(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

export function subtractDays(dateStr, days) {
  return addDays(dateStr, -days)
}

export function dateRange(start, end) {
  const dates = []
  let current = start
  while (current <= end) {
    dates.push(current)
    current = addDays(current, 1)
  }
  return dates
}

export function calcAge(dob) {
  if (!dob) return null
  const birth = parseDate(dob)
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const m = now.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--
  return age
}

export function getMonthDates(year, month) {
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 0))
  return dateRange(toISODate(start), toISODate(end))
}

export function quickPresets() {
  const today = todayISO()
  return [
    { label: 'Last 7 Days', start: subtractDays(today, 6), end: today },
    { label: 'Last 15 Days', start: subtractDays(today, 14), end: today },
    { label: 'Last 30 Days', start: subtractDays(today, 29), end: today },
    { label: 'Last 60 Days', start: subtractDays(today, 59), end: today },
    { label: 'Last 90 Days', start: subtractDays(today, 89), end: today },
  ]
}
