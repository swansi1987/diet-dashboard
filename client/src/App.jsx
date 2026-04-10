import { useAuth } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import LoginScreen from './components/auth/LoginScreen.jsx'
import Shell from './components/layout/Shell.jsx'
import { FullPageSpinner } from './components/ui/LoadingSpinner.jsx'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!user) return <LoginScreen />

  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
