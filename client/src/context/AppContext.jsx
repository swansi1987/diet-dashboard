import { createContext, useContext, useState } from 'react'
import { todayISO } from '../utils/dateUtils.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  return (
    <AppContext.Provider value={{ activeView, setActiveView, selectedDate, setSelectedDate }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
