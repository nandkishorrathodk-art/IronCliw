import { useState } from 'react'
import { 
  Shield, Key, Eye, EyeOff, AlertTriangle, CheckCircle2,
  Server, Globe, Users, History
} from 'lucide-react'

interface SecurityEvent {
  id: string
  type: 'auth' | 'access' | 'system'
  description: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: string
  source: string
}

const securityEvents: SecurityEvent[] = [
  {
    id: '1',
    type: 'auth',
    description: 'Login from new device',
    severity: 'info',
    timestamp: '2 minutes ago',
    source: 'Web Dashboard',
  },
  {
    id: '2',
    type: 'access',
    description: 'API key generated',
    severity: 'info',
    timestamp: '1 hour ago',
    source: 'CLI',
  },
  {
    id: '3',
    type: 'system',
    description: 'Failed login attempt',
    severity: 'warning',
    timestamp: '3 hours ago',
    source: 'API',
  },
]

const integrations = [
  { id: 'telegram', name: 'Telegram', status: 'connected', icon: '💬' },
  { id: 'discord', name: 'Discord', status: 'connected', icon: '🎮' },
  { id: 'whatsapp', name: 'WhatsApp', status: 'pending', icon: '📱' },
  { id: 'slack', name: 'Slack', status: 'disconnected', icon: '💼' },
]

export default function Security() {
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'logs'>('overview')
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-emerald-500" />
            Security Center
          </h1>
          <p className="text-slate-400">Manage access, keys, and audit logs</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium">
            Add API Key
          </button>
        </div>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Secure</span>
          </div>
          <p className="text-2xl font-bold">100%</p>
          <p className="text-xs text-slate-500">Security score</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Key className="w-5 h-5" />
            <span className="text-sm font-medium">API Keys</span>
          </div>
          <p className="text-2xl font-bold">4</p>
          <p className="text-xs text-slate-500">Active keys</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Sessions</span>
          </div>
          <p className="text-2xl font-bold">2</p>
          <p className="text-xs text-slate-500">Active now</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <History className="w-5 h-5" />
            <span className="text-sm font-medium">Events</span>
          </div>
          <p className="text-2xl font-bold">127</p>
          <p className="text-xs text-slate-500">Last 24h</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {(['overview', 'keys', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab ? 'text-emerald-500 border-emerald-500' : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connected Integrations */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Connected Integrations
            </h3>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{integration.icon}</span>
                    <span className="font-medium">{integration.name}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    integration.status === 'connected' ? 'bg-emerald-600/20 text-emerald-400' :
                    integration.status === 'pending' ? 'bg-amber-600/20 text-amber-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {integration.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Security Events */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Recent Events
            </h3>
            <div className="space-y-3">
              {securityEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
                  <div className={`p-1.5 rounded ${
                    event.severity === 'info' ? 'bg-blue-600/20 text-blue-400' :
                    event.severity === 'warning' ? 'bg-amber-600/20 text-amber-400' :
                    'bg-red-600/20 text-red-400'
                  }`}>
                    {event.type === 'auth' && <Key className="w-4 h-4" />}
                    {event.type === 'access' && <Eye className="w-4 h-4" />}
                    {event.type === 'system' && <Server className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.description}</p>
                    <p className="text-xs text-slate-500">{event.source} • {event.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'keys' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          <div className="p-5 border-b border-slate-800">
            <h3 className="font-semibold">API Keys</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Key className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Production Key</p>
                  <p className="text-xs text-slate-500">Created 3 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <code className="px-3 py-1 bg-slate-950 rounded text-sm font-mono text-slate-400">
                  {showApiKey ? 'ic_live_51Hx9kL2jF...dN8mP' : '••••••••••••••••'}
                </code>
                <button 
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
