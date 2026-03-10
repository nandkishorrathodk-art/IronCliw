import { useState } from 'react'
import { 
  Server, Plus, RefreshCw, Settings, Terminal, Activity,
  Wifi, WifiOff, CheckCircle2, Clock, ArrowRight
} from 'lucide-react'

interface Node {
  id: string
  name: string
  type: 'local' | 'remote' | 'cloud'
  status: 'online' | 'offline' | 'busy' | 'error'
  version: string
  platform: string
  lastSeen: string
  cpu: number
  memory: number
  tasks: number
  capabilities: string[]
}

const nodes: Node[] = [
  {
    id: 'node-1',
    name: 'Local Workstation',
    type: 'local',
    status: 'online',
    version: '2026.0.3',
    platform: 'Windows 11',
    lastSeen: 'Just now',
    cpu: 23,
    memory: 45,
    tasks: 2,
    capabilities: ['browser', 'voice', 'file-system', 'shell'],
  },
  {
    id: 'node-2',
    name: 'Home Server',
    type: 'remote',
    status: 'online',
    version: '2026.0.3',
    platform: 'Ubuntu 24.04',
    lastSeen: '2 min ago',
    cpu: 15,
    memory: 32,
    tasks: 1,
    capabilities: ['browser', 'docker', 'gpu', 'file-system'],
  },
  {
    id: 'node-3',
    name: 'Cloud Instance',
    type: 'cloud',
    status: 'busy',
    version: '2026.0.2',
    platform: 'Ubuntu 22.04',
    lastSeen: '5 min ago',
    cpu: 78,
    memory: 62,
    tasks: 5,
    capabilities: ['browser', 'api', 'database'],
  },
]

export default function NodeManager() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [_viewMode, _setViewMode] = useState<'grid' | 'list'>('grid')

  const onlineCount = nodes.filter(n => n.status === 'online').length
  const busyCount = nodes.filter(n => n.status === 'busy').length
  const totalTasks = nodes.reduce((acc, n) => acc + n.tasks, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Server className="w-7 h-7 text-orange-500" />
            Node Manager
          </h1>
          <p className="text-slate-400">Manage connected IronCliw nodes</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4 inline mr-2" />
            Add Node
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Online</span>
          </div>
          <p className="text-2xl font-bold">{onlineCount}</p>
          <p className="text-xs text-slate-500">of {nodes.length} nodes</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">Busy</span>
          </div>
          <p className="text-2xl font-bold">{busyCount}</p>
          <p className="text-xs text-slate-500">Processing tasks</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Terminal className="w-5 h-5" />
            <span className="text-sm font-medium">Tasks</span>
          </div>
          <p className="text-2xl font-bold">{totalTasks}</p>
          <p className="text-xs text-slate-500">Running now</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Server className="w-5 h-5" />
            <span className="text-sm font-medium">Versions</span>
          </div>
          <p className="text-2xl font-bold">2</p>
          <p className="text-xs text-slate-500">Active versions</p>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <div 
            key={node.id}
            className={`p-5 rounded-xl border transition-all cursor-pointer ${
              selectedNode?.id === node.id 
                ? 'border-orange-500 bg-orange-500/10' 
                : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}
            onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  node.status === 'online' ? 'bg-emerald-600/20 text-emerald-500' :
                  node.status === 'busy' ? 'bg-amber-600/20 text-amber-500' :
                  'bg-red-600/20 text-red-500'
                }`}>
                  {node.status === 'online' ? <Wifi className="w-5 h-5" /> : 
                   node.status === 'busy' ? <Activity className="w-5 h-5" /> :
                   <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold">{node.name}</h3>
                  <p className="text-xs text-slate-500">{node.platform} • v{node.version}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                node.status === 'online' ? 'bg-emerald-600/20 text-emerald-400' :
                node.status === 'busy' ? 'bg-amber-600/20 text-amber-400' :
                'bg-red-600/20 text-red-400'
              }`}>
                {node.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-800 p-2 rounded">
                <p className="text-xs text-slate-500">CPU</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        node.cpu > 80 ? 'bg-red-500' : node.cpu > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${node.cpu}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{node.cpu}%</span>
                </div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <p className="text-xs text-slate-500">Memory</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        node.memory > 80 ? 'bg-red-500' : node.memory > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${node.memory}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{node.memory}%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {node.capabilities.slice(0, 4).map(cap => (
                <span key={cap} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 capitalize">
                  {cap.replace('-', ' ')}
                </span>
              ))}
              {node.capabilities.length > 4 && (
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                  +{node.capabilities.length - 4}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-500">
                <Clock className="w-3 h-3 inline mr-1" />
                {node.lastSeen}
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
                  <Terminal className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
