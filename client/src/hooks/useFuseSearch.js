import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'

/**
 * Fuse.js options tuned for food name search:
 *  - ignoreLocation: true  → allows "paneer" to match "McSpicy Paneer Burger"
 *  - threshold: 0.4        → tolerates typos like "chiken" → "Chicken Breast"
 *  - weights               → name matters more than brand_name
 */
const FOOD_FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'brand_name', weight: 0.3 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
  shouldSort: true,
}

/**
 * useFuseSearch — client-side debounced fuzzy search hook.
 *
 * @param {Array}  items       - The full list of items to search (e.g. all foods)
 * @param {Object} options     - Fuse.js options (defaults to FOOD_FUSE_OPTIONS)
 * @param {number} debounceMs  - Delay in ms before filtering (default 250ms)
 * @returns {{ query: string, results: Array, search: Function }}
 *   - query:   current search term
 *   - results: filtered + ranked items (full item objects, score stripped)
 *   - search:  call this with the new term on every input change
 */
export function useFuseSearch(items, options = FOOD_FUSE_OPTIONS, debounceMs = 250) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const timerRef = useRef(null)

  // Rebuild Fuse index whenever the items list changes (e.g. on first load)
  const fuse = useMemo(() => new Fuse(items, options), [items]) // eslint-disable-line react-hooks/exhaustive-deps

  // When items first arrive ([] → populated), sync results to show full list
  useEffect(() => {
    if (!query) setResults(items)
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback((term) => {
    setQuery(term)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const trimmed = term.trim()
      if (!trimmed || trimmed.length < 2) {
        // Fewer than 2 chars → show everything (avoids noise from single letters)
        setResults(items)
      } else {
        // Fuse returns { item, score, refIndex } — extract just the item
        setResults(fuse.search(trimmed).map(r => r.item))
      }
    }, debounceMs)
  }, [fuse, items, debounceMs])

  // Cleanup pending timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { query, results, search }
}
