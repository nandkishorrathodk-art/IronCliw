import { useState } from 'react'
import { 
  Settings, User, Bell, Globe, Shield, Database, Server,
  Palette, Moon, Sun, Laptop
} from 'lucide-react'

interface SettingsSection {
  id: string
  name: string
  icon: React.ElementType
  description: string
}

const sections: SettingsSection[] = [
  { id: 'general', name: 'General', icon: Settings, description: 'Basic preferences' },
  { id: 'account', name: 'Account', icon: User, description: 'Profile and auth' },
  { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alerts and messages' },
  { id: 'appearance', name: 'Appearance', icon: Palette, description: 'Theme and display' },
  { id: 'integrations', name: 'Integrations', icon: Globe, description: 'Connected services' },
  { id: 'security', name: 'Security', icon: Shield, description: 'Access and privacy' },
  { id: 'storage', name: 'Storage', icon: Database, description: 'Data and cache' },
  { id: 'advanced', name: 'Advanced', icon: Server, description: 'System settings' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7 text-slate-400" />
          Settings
        </h1>
        <p className="text-slate-400">Configure IronCliw to your preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeSection === section.id 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <p className="font-medium text-sm">{section.name}</p>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'general' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
              <h2 className="text-lg font-semibold">General Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Language</p>
                    <p className="text-sm text-slate-500">Interface language</p>
                  </div>
                  <select className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Timezone</p>
                    <p className="text-sm text-slate-500">Local timezone</p>
                  </div>
                  <select className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                    <option>UTC-8 (Pacific)</option>
                    <option>UTC-5 (Eastern)</option>
                    <option>UTC+0 (London)</option>
                    <option>UTC+1 (Berlin)</option>
                    <option>UTC+5:30 (India)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <p className="font-medium">Auto-save</p>
                    <p className="text-sm text-slate-500">Save sessions automatically</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
              <h2 className="text-lg font-semibold">Appearance</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-lg border transition-colors ${
                        theme === 'dark' ? 'border-blue-500 bg-blue-600/20' : 'border-slate-800 bg-slate-800'
                      }`}
                    >
                      <Moon className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">Dark</p>
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-lg border transition-colors ${
                        theme === 'light' ? 'border-blue-500 bg-blue-600/20' : 'border-slate-800 bg-slate-800'
                      }`}
                    >
                      <Sun className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">Light</p>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-4 rounded-lg border transition-colors ${
                        theme === 'system' ? 'border-blue-500 bg-blue-600/20' : 'border-slate-800 bg-slate-800'
                      }`}
                    >
                      <Laptop className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm">System</p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-800">
                  <div>
                    <p className="font-medium">Compact mode</p>
                    <p className="text-sm text-slate-500">Reduce spacing in the interface</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-800">
                  <div>
                    <p className="font-medium">Show animations</p>
                    <p className="text-sm text-slate-500">Enable transition animations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
              <h2 className="text-lg font-semibold">Notifications</h2>
              
              <div className="space-y-4">
                {['Session completed', 'Agent message', 'System alert', 'Extension update'].map((item) => (
                  <div key={item} className="flex items-center justify-between py-3 border-b border-slate-800">
                    <div>
                      <p className="font-medium">{item}</p>
                      <p className="text-sm text-slate-500">Receive notification</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
