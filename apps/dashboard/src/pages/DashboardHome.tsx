import React, { useState } from 'react'
import {
  Activity,
  Users,
  Zap,
  MessageSquare,
  Bot,
} from 'lucide-react'

interface SystemStats {
  activeAgents: number
  totalMessages: number
  skillsInstalled: number
  avgResponseTime: number
  cpuUsage: number
  memoryUsage: number
  uptime: string
}

export default function DashboardHome() {
  const [stats, _setStats] = useState<SystemStats>({
    activeAgents: 3,
    totalMessages: 1247,
    skillsInstalled: 42,
    avgResponseTime: 850,
    cpuUsage: 24,
    memoryUsage: 1.2,
    uptime: '2d 14h 32m',
  })

  const [recentActivity, _setRecentActivity] = useState([
    { id: 1, type: 'agent', message: 'CodeReviewAgent completed analysis', time: '2m ago' },
    { id: 2, type: 'skill', message: 'Installed skill: weather-v2', time: '15m ago' },
    { id: 3, type: 'message', message: 'New Telegram message received', time: '32m ago' },
    { id: 4, type: 'system', message: 'Model hub auto-switched to Claude 3.5', time: '1h ago' },
  ])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IronCliw Dashboard</h1>
          <p className="text-slate-400">Real-time system overview and metrics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bot}
          label="Active Agents"
          value={stats.activeAgents}
          trend="+2 today"
          color="blue"
        />
        <StatCard
          icon={MessageSquare}
          label="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          trend="+127 today"
          color="purple"
        />
        <StatCard
          icon={Zap}
          label="Avg Response Time"
          value={`${stats.avgResponseTime}ms`}
          trend="-12% faster"
          color="green"
        />
        <StatCard
          icon={Users}
          label="Skills Installed"
          value={stats.skillsInstalled}
          trend="+3 this week"
          color="orange"
        />
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Performance (24h)</h3>
          <div className="h-48 flex items-end gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 60, 75, 50, 85, 45].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-600/50 rounded-t hover:bg-blue-500 transition-colors"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>Now</span>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Resource Usage</h3>
          <div className="space-y-4">
            <ResourceBar label="CPU" value={stats.cpuUsage} max={100} color="blue" />
            <ResourceBar label="Memory" value={stats.memoryUsage} max={4} unit="GB" color="purple" />
            <ResourceBar label="API Rate Limit" value={65} max={100} color="orange" />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-sm">
            <span className="text-slate-400">Uptime</span>
            <span className="font-mono">{stats.uptime}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/50">
              <ActivityIcon type={activity.type} />
              <div className="flex-1">
                <p className="text-sm">{activity.message}</p>
              </div>
              <span className="text-xs text-slate-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; trend: string; color: string }
function StatCard({ icon: Icon, label, value, trend, color }: StatCardProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs text-green-400">{trend}</span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  )
}

interface ResourceBarProps { label: string; value: number; max: number; unit?: string; color: string }
function ResourceBar({ label, value, max, unit = '', color }: ResourceBarProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span>
          {value}
          {unit} / {max}
          {unit}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    agent: Bot,
    skill: Zap,
    message: MessageSquare,
    system: Activity,
  }
  const Icon = icons[type] || Activity

  const colors: Record<string, string> = {
    agent: 'bg-blue-500/20 text-blue-400',
    skill: 'bg-purple-500/20 text-purple-400',
    message: 'bg-green-500/20 text-green-400',
    system: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <div className={`p-2 rounded-lg ${colors[type] || colors.system}`}>
      <Icon className="w-4 h-4" />
    </div>
  )
}
