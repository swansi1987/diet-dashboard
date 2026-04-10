import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import { useApp } from '../../context/AppContext.jsx'

// Lazy-load views
import DashboardView from '../dashboard/DashboardView.jsx'
import DailyLoggerView from '../logger/DailyLoggerView.jsx'
import FoodDatabaseView from '../fooddb/FoodDatabaseView.jsx'
import ReportsView from '../reports/ReportsView.jsx'
import WeightLogView from '../weight/WeightLogView.jsx'
import ProfileView from '../profile/ProfileView.jsx'
import MealPlannerView from '../planner/MealPlannerView.jsx'
import DataManagementView from '../datamanagement/DataManagementView.jsx'
import SettingsView from '../settings/SettingsView.jsx'

const VIEWS = {
  dashboard: DashboardView,
  logger: DailyLoggerView,
  fooddb: FoodDatabaseView,
  reports: ReportsView,
  weight: WeightLogView,
  profile: ProfileView,
  planner: MealPlannerView,
  data: DataManagementView,
  settings: SettingsView,
}

export default function Shell() {
  const { activeView } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const ActiveView = VIEWS[activeView] || DashboardView

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full">
            <Sidebar mobile onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <ActiveView />
        </main>
      </div>
    </div>
  )
}
