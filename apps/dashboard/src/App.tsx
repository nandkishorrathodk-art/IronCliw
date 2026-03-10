import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  Store,
  MessageSquare,
  Activity,
  Settings,
  Mic,
  Cpu,
  Terminal,
} from 'lucide-react'
import DashboardHome from './pages/DashboardHome'
import AgentMonitor from './pages/AgentMonitor'
import SkillMarketplace from './pages/SkillMarketplace'
import Conversations from './pages/Conversations'
import SystemHealth from './pages/SystemHealth'
import VoiceControl from './pages/VoiceControl'
import ModelHub from './pages/ModelHub'
import SettingsPage from './pages/Settings'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agents', icon: Bot, label: 'Agent Monitor' },
    { to: '/skills', icon: Store, label: 'Skill Marketplace' },
    { to: '/conversations', icon: MessageSquare, label: 'Conversations' },
    { to: '/models', icon: Cpu, label: 'Model Hub' },
    { to: '/voice', icon: Mic, label: 'Voice I/O' },
    { to: '/health', icon: Activity, label: 'System Health' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside
        className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg">IronCliw</span>
            )}
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute bottom-4 left-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/agents" element={<AgentMonitor />} />
          <Route path="/skills" element={<SkillMarketplace />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/voice" element={<VoiceControl />} />
          <Route path="/models" element={<ModelHub />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
