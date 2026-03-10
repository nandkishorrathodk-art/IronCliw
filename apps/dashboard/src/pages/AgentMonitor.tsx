import { useState } from 'react'
import React from 'react'
import { Bot, Play, Pause, Square, Terminal, Clock } from 'lucide-react'

interface Agent {
  id: string
  name: string
  status: 'running' | 'idle' | 'error' | 'completed'
  type: 'coding' | 'research' | 'planning' | 'review'
  startTime: string
  duration: string
  progress: number
  logs: string[]
}

export default function AgentMonitor() {
  const [agents, _setAgents] = useState<Agent[]>([
    {
      id: 'agent-001',
      name: 'CodeReviewAgent',
      status: 'running',
      type: 'review',
      startTime: '12:04 PM',
      duration: '2m 34s',
      progress: 65,
      logs: ['Analyzing file: src/components/Button.tsx', 'Found 3 issues', 'Running eslint...'],
    },
    {
      id: 'agent-002',
      name: 'ResearchAgent',
      status: 'idle',
      type: 'research',
      startTime: '-',
      duration: '-',
      progress: 0,
      logs: [],
    },
    {
      id: 'agent-003',
      name: 'PlanningAgent',
      status: 'completed',
      type: 'planning',
      startTime: '11:45 AM',
      duration: '15m 22s',
      progress: 100,
      logs: ['Task breakdown complete', '3 sub-agents spawned', 'Plan finalized'],
    },
  ])

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0])

  return (
    <div className="p-6 h-full flex gap-6">
      {/* Agent List */}
      <div className="w-1/3 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Active Agents</h2>
          <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
            + New
          </button>
        </div>

        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedAgent?.id === agent.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusColor(agent.status)}`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-slate-400">
                    {agent.type} • {agent.status}
                  </p>
                </div>
                <StatusBadge status={agent.status} />
              </div>

              {agent.status === 'running' && (
                <div className="mt-3">
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{agent.progress}%</span>
                    <span>{agent.duration}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Details */}
      {selectedAgent && (
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor(selectedAgent.status)}`}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{selectedAgent.name}</h3>
                <p className="text-xs text-slate-400">ID: {selectedAgent.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedAgent.status === 'running' ? (
                <>
                  <button className="p-2 hover:bg-slate-800 rounded-lg">
                    <Pause className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-slate-800 rounded-lg text-red-400">
                    <Square className="w-4 h-4" />
                  </button>
                </>
              ) : selectedAgent.status === 'idle' ? (
                <button className="p-2 hover:bg-slate-800 rounded-lg text-green-400">
                  <Play className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-4 grid grid-cols-3 gap-4 border-b border-slate-800">
            <Metric label="Type" value={selectedAgent.type} icon={Bot} />
            <Metric label="Started" value={selectedAgent.startTime} icon={Clock} />
            <Metric label="Duration" value={selectedAgent.duration} icon={Clock} />
          </div>

          {/* Agent Flow Visualization */}
          <div className="p-4 border-b border-slate-800">
            <h4 className="text-sm font-medium mb-3">Execution Flow</h4>
            <div className="flex items-center gap-2">
              {['Planning', 'Execution', 'Review', 'Complete'].map((step, i) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`px-3 py-1 rounded-full text-sm ${
                      i <= getStepIndex(selectedAgent.status)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {step}
                  </div>
                  {i < 3 && (
                    <div className="w-8 h-0.5 bg-slate-700 mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Logs */}
          <div className="p-4 h-64 overflow-auto">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Live Logs
            </h4>
            <div className="font-mono text-sm space-y-1">
              {selectedAgent.logs.length === 0 ? (
                <p className="text-slate-500">No logs available</p>
              ) : (
                selectedAgent.logs.map((log, i) => (
                  <p key={i} className="text-slate-300">
                    <span className="text-slate-500">[{selectedAgent.startTime}]</span> {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-400',
    idle: 'bg-slate-700 text-slate-400',
    error: 'bg-red-500/20 text-red-400',
    completed: 'bg-green-500/20 text-green-400',
  }
  return colors[status] || colors.idle
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-blue-500',
    idle: 'bg-slate-500',
    error: 'bg-red-500',
    completed: 'bg-green-500',
  }
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className={`w-2 h-2 rounded-full ${colors[status]} ${status === 'running' ? 'animate-pulse' : ''}`} />
      <span className="capitalize">{status}</span>
    </div>
  )
}

interface MetricProps { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }
function Metric({ label, value, icon: Icon }: MetricProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-slate-800 rounded-lg">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function getStepIndex(status: string) {
  const steps: Record<string, number> = {
    idle: 0,
    running: 1,
    completed: 3,
    error: 2,
  }
  return steps[status] || 0
}