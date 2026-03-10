import { useState } from 'react'
import { Brain, Zap } from 'lucide-react'

interface Model {
  id: string
  name: string
  provider: string
  description: string
  capabilities: string[]
  latency: string
  contextLength: number
  pricing: { input: number; output: number }
  status: 'available' | 'limited'
  popularity: number
}

const models: Model[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best for complex reasoning and coding tasks',
    capabilities: ['Vision', 'Function Calling', 'Code'],
    latency: 'Fast',
    contextLength: 200000,
    pricing: { input: 3.0, output: 15.0 },
    status: 'available',
    popularity: 95,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Multimodal powerhouse with vision and audio',
    capabilities: ['Vision', 'Audio', 'Functions'],
    latency: 'Fast',
    contextLength: 128000,
    pricing: { input: 5.0, output: 15.0 },
    status: 'available',
    popularity: 92,
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Massive context window for document analysis',
    capabilities: ['Vision', 'Long Context'],
    latency: 'Fast',
    contextLength: 1000000,
    pricing: { input: 3.5, output: 10.5 },
    status: 'available',
    popularity: 85,
  },
]

export default function ModelHub() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)

  const providers = [...new Set(models.map(m => m.provider))]
  const filteredModels = selectedProvider ? models.filter(m => m.provider === selectedProvider) : models

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="w-7 h-7 text-pink-500" />
            Model Hub
          </h1>
          <p className="text-slate-400">Choose the perfect AI model for your task</p>
        </div>
        <button className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium">
          Add Custom Model
        </button>
      </div>

      {/* Provider Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedProvider(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedProvider === null ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-slate-800 text-slate-400'
          }`}
        >
          All Providers
        </button>
        {providers.map(provider => (
          <button
            key={provider}
            onClick={() => setSelectedProvider(provider === selectedProvider ? null : provider)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedProvider === provider ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {provider}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <div 
            key={model.id}
            className={`p-5 rounded-xl border transition-all cursor-pointer ${
              selectedModel?.id === model.id ? 'border-pink-500 bg-pink-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}
            onClick={() => setSelectedModel(selectedModel?.id === model.id ? null : model)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center font-bold text-sm">
                  {model.provider[0]}
                </div>
                <div>
                  <h3 className="font-semibold">{model.name}</h3>
                  <p className="text-xs text-slate-500">{model.provider}</p>
                </div>
              </div>
              <div className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-medium">
                {model.status}
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-3">{model.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {model.capabilities.map(cap => (
                <span key={cap} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">{cap}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800 p-2 rounded">
                <span className="text-slate-500 block">Context</span>
                <span className="font-medium">{(model.contextLength / 1000).toFixed(0)}k tokens</span>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <span className="text-slate-500 block">Latency</span>
                <span className="font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {model.latency}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
