import React from 'react'
import { Settings as SettingsIcon, Sun, Moon, Palette } from 'lucide-react'
import { useTheme } from '../lib/theme'

export function Settings() {
  const { theme, setTheme, toggleTheme } = useTheme()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure your application preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Configuration */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Customize the look and feel of your application
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {theme === 'light' ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-blue-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Switch between light and dark mode
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Sun className="h-4 w-4 inline mr-2" />
                    Light
                  </button>
                  
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Moon className="h-4 w-4 inline mr-2" />
                    Dark
                  </button>
                </div>
              </div>

              {/* Quick Toggle Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Quick Toggle</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle between themes with a single click
                  </p>
                </div>
                
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Information */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">About Themes</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <p>
                    Choose between light and dark themes to match your preferences or working environment.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Light Theme:</strong> Clean and bright interface, ideal for well-lit environments</li>
                    <li><strong>Dark Theme:</strong> Easy on the eyes, perfect for low-light conditions</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your theme preference is automatically saved and will persist across sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Application Info</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Information about your Disease Intelligence Program installation
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Version</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">1.0.0</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Environment</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Development</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Last Updated</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Data Source</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">TPCHD Local Data</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Point of Contact</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cody.Carmichael@broadlyepi.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useTheme } from '../lib/theme'

export function Settings() {
  const { theme, setTheme, toggleTheme } = useTheme()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure your application preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Configuration */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Customize the look and feel of your application
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {theme === 'light' ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-blue-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Switch between light and dark mode
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Sun className="h-4 w-4 inline mr-2" />
                    Light
                  </button>
                  
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Moon className="h-4 w-4 inline mr-2" />
                    Dark
                  </button>
                </div>
              </div>

              {/* Quick Toggle Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Quick Toggle</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle between themes with a single click
                  </p>
                </div>
                
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Information */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">About Themes</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <p>
                    Choose between light and dark themes to match your preferences or working environment.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Light Theme:</strong> Clean and bright interface, ideal for well-lit environments</li>
                    <li><strong>Dark Theme:</strong> Easy on the eyes, perfect for low-light conditions</li>
                  </ul>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your theme preference is automatically saved and will persist across sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Application Info</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Information about your Disease Intelligence Program installation
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Version</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">1.0.0</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Environment</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Development</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Last Updated</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Data Source</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">TPCHD Local Data</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Point of Contact</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cody.Carmichael@broadlyepi.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}