import { useState } from 'react'
import { 
  Mic, 
  Volume2, 
  Settings, 
  MessageSquare,
  RotateCcw,
  MicOff,
  VolumeX
} from 'lucide-react'

const voices = [
  { id: 'nova', name: 'Nova', gender: 'female', accent: 'slightly British', premium: true },
  { id: 'echo', name: 'Echo', gender: 'male', accent: 'neutral', premium: true },
  { id: 'onyx', name: 'Onyx', gender: 'male', accent: 'warm', premium: true },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', accent: 'bright', premium: true },
  { id: 'alloy', name: 'Alloy', gender: 'neutral', accent: 'professional', premium: true },
]

export default function Voice2() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversation' | 'settings'>('conversation')
  const [config, setConfig] = useState({
    voice: 'nova',
    speed: 1.0,
    language: 'en-US',
  })
  const [chatHistory] = useState([
    { role: 'user', text: "Hey IronCliw, what's the weather today?", timestamp: '12:08 PM' },
    { role: 'assistant', text: 'Hello! I can check the weather for you. What city are you in?', timestamp: '12:08 PM' },
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Mic className="w-7 h-7 text-purple-500" />
            Voice 2.0
          </h1>
          <p className="text-slate-400">Natural conversations with your AI</p>
        </div>
        <div className="flex gap-2">
          {(['conversation', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'conversation' && <MessageSquare className="w-4 h-4 inline mr-2" />}
              {tab === 'settings' && <Settings className="w-4 h-4 inline mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'conversation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">
                  {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
                </span>
              </div>
              
              <div className="h-32 flex items-center justify-center gap-1">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      isListening || isSpeaking
                        ? 'bg-gradient-to-t from-purple-600 to-pink-500'
                        : 'bg-slate-700'
                    }`}
                    style={{
                      height: isListening || isSpeaking
                        ? `${Math.random() * 80 + 20}%`
                        : '20%',
                    }}
                  />
                ))}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setIsListening(!isListening)}
                  className={`p-4 rounded-full transition-all ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => setIsSpeaking(!isSpeaking)}
                  className={`p-4 rounded-full transition-all ${
                    isSpeaking
                      ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/30'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                <button className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 transition-all">
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                    }`}>
                      {msg.role === 'user' ? 'U' : 'I'}
                    </div>
                    <div className={`max-w-[70%] rounded-xl p-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600/20 border border-blue-500/20' 
                        : 'bg-slate-800'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className="text-xs text-slate-500 mt-1 block">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h3 className="font-semibold mb-4">Quick Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Voice</label>
                  <select 
                    value={config.voice}
                    onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                  >
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender}, {v.accent}) {v.premium && '★'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Speed</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.speed}
                    onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0.5x</span>
                    <span>{config.speed}x</span>
                    <span>2x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
