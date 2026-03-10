import { useState } from 'react'
import { 
  Zap, Clock, Play, Pause, Trash2, Edit3, Plus,
  Workflow
} from 'lucide-react'

interface Automation {
  id: string
  name: string
  description: string
  trigger: string
  actions: string[]
  status: 'active' | 'paused' | 'error'
  lastRun: string
  runCount: number
}

const automations: Automation[] = [
  {
    id: '1',
    name: 'Morning Briefing',
    description: 'Daily summary of emails, calendar, and news at 8 AM',
    trigger: 'Scheduled: Daily 8:00 AM',
    actions: ['Fetch emails', 'Check calendar', 'Generate summary'],
    status: 'active',
    lastRun: 'Today 8:00 AM',
    runCount: 156,
  },
  {
    id: '2',
    name: 'Git Auto-Commit',
    description: 'Auto-commit workspace changes every 30 minutes',
    trigger: 'Interval: 30 minutes',
    actions: ['Check git status', 'Stage changes', 'Commit', 'Push'],
    status: 'active',
    lastRun: 'Today 11:30 AM',
    runCount: 423,
  },
  {
    id: '3',
    name: 'Smart Reply Assistant',
    description: 'Draft replies to priority emails automatically',
    trigger: 'Event: New email received',
    actions: ['Analyze email', 'Draft response'],
    status: 'paused',
    lastRun: 'Yesterday 4:30 PM',
    runCount: 89,
  },
]

const StatCard = ({ label, value, subtext, color }: { label: string, value: string, subtext: string, color: string }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-600/20 text-green-400',
    blue: 'bg-blue-600/20 text-blue-400',
    purple: 'bg-purple-600/20 text-purple-400',
    amber: 'bg-amber-600/20 text-amber-400',
  }
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color].split(' ')[1]}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtext}</p>
    </div>
  )
}

export default function Automation() {
  const [activeTab, setActiveTab] = useState<'automations' | 'templates' | 'logs'>('automations')
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Workflow className="w-7 h-7 text-amber-500" />
            Automation Engine
          </h1>
          <p className="text-slate-400">Build powerful workflows without code</p>
        </div>
        <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active" value="3" subtext="Running now" color="green" />
        <StatCard label="Total Runs" value="980" subtext="This month" color="blue" />
        <StatCard label="Success Rate" value="99.2%" subtext="Last 30 days" color="purple" />
        <StatCard label="Time Saved" value="47h" subtext="This month" color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {(['automations', 'templates', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab ? 'text-amber-500 border-amber-500' : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Automations List */}
      {activeTab === 'automations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {automations.map((automation) => (
            <div 
              key={automation.id}
              className={`p-5 rounded-xl border transition-all ${
                selectedAutomation === automation.id ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
              onClick={() => setSelectedAutomation(automation.id === selectedAutomation ? null : automation.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    automation.status === 'active' ? 'bg-green-600/20 text-green-500' :
                    automation.status === 'paused' ? 'bg-amber-600/20 text-amber-500' : 'bg-red-600/20 text-red-500'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{automation.name}</h3>
                    <p className="text-xs text-slate-500">{automation.description}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  automation.status === 'active' ? 'bg-green-600/20 text-green-400' :
                  automation.status === 'paused' ? 'bg-amber-600/20 text-amber-400' : 'bg-red-600/20 text-red-400'
                }`}>
                  {automation.status}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">{automation.trigger}</span>
                </div>
                <div className="flex gap-2">
                  {automation.actions.map((action, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">{action}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-500">
                  <span>Last run: {automation.lastRun}</span>
                  <span className="mx-2">|</span>
                  <span>{automation.runCount} runs</span>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
                    {automation.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-slate-800 rounded text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
