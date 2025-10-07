import React from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SimulationResults } from '../lib/simulationService'
import { useTheme } from '../lib/theme'

interface SEIRChartProps {
  results: SimulationResults
}

export function SEIRChart({ results }: SEIRChartProps) {
  const { theme } = useTheme()
  
  // Transform the simulation data for the chart
  const chartData = results.results.time_points.map((day, index) => ({
    day,
    susceptible: Math.round(results.results.susceptible[index] || 0),
    exposed: Math.round(results.results.exposed?.[index] || 0),
    infected: Math.round(results.results.infected[index] || 0),
    recovered: Math.round(results.results.recovered[index] || 0),
    deaths: Math.round(results.results.deaths[index] || 0)
  }))

  // Get disease-specific colors
  const getDiseaseColors = (disease: string) => {
    switch (disease.toUpperCase()) {
      case 'COVID':
        return {
          primary: '#3b82f6',
          secondary: '#1e40af',
          accent: '#dbeafe',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
      case 'FLU':
        return {
          primary: '#10b981',
          secondary: '#047857',
          accent: '#d1fae5',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
      case 'RSV':
        return {
          primary: '#f59e0b',
          secondary: '#d97706',
          accent: '#fef3c7',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
      default:
        return {
          primary: '#6b7280',
          secondary: '#4b5563',
          accent: '#f3f4f6',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
    }
  }

  const colors = getDiseaseColors(results.disease_name)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const day = label
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">Day {day}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {entry.dataKey}:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {entry.value?.toLocaleString() || 0}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-red-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Infections</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(results.results.summary.peak_infection).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-blue-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Infected</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(results.results.summary.total_infected).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-green-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Attack Rate</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {(results.results.summary.attack_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Deaths</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(results.results.summary.total_deaths).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Simulation Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {results.disease_name} Disease Progression ({results.duration_days}-day forecast)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                formatter={(value, name) => [value.toLocaleString(), name]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="susceptible"
                stackId="1"
                stroke="none"
                fill="#e5e7eb"
                name="Susceptible"
              />
              {results.results.exposed && (
                <Area
                  type="monotone"
                  dataKey="exposed"
                  stackId="1"
                  stroke="none"
                  fill="#fbbf24"
                  name="Exposed"
                />
              )}
              <Area
                type="monotone"
                dataKey="infected"
                stackId="1"
                stroke="none"
                fill={colors.primary}
                name="Infected"
              />
              <Area
                type="monotone"
                dataKey="recovered"
                stackId="1"
                stroke="none"
                fill="#10b981"
                name="Recovered"
              />
              <Line 
                type="monotone" 
                dataKey="deaths" 
                stroke="#6b7280" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Deaths"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

import { SimulationResults } from '../lib/simulationService'
import { useTheme } from '../lib/theme'

interface SEIRChartProps {
  results: SimulationResults
}

export function SEIRChart({ results }: SEIRChartProps) {
  const { theme } = useTheme()
  
  // Transform the simulation data for the chart
  const chartData = results.results.time_points.map((day, index) => ({
    day,
    susceptible: Math.round(results.results.susceptible[index] || 0),
    exposed: Math.round(results.results.exposed?.[index] || 0),
    infected: Math.round(results.results.infected[index] || 0),
    recovered: Math.round(results.results.recovered[index] || 0),
    deaths: Math.round(results.results.deaths[index] || 0)
  }))

  // Get disease-specific colors
  const getDiseaseColors = (disease: string) => {
    switch (disease.toUpperCase()) {
      case 'COVID':
        return {
          primary: '#3b82f6',
          secondary: '#1e40af',
          accent: '#dbeafe',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
      case 'FLU':
        return {
          primary: '#10b981',
          secondary: '#047857',
          accent: '#d1fae5',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
      case 'RSV':
        return {
          primary: '#f59e0b',
          secondary: '#d97706',
          accent: '#fef3c7',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
      default:
        return {
          primary: '#6b7280',
          secondary: '#4b5563',
          accent: '#f3f4f6',
          susceptible: '#6b7280',
          exposed: '#f59e0b',
          infected: '#ef4444',
          recovered: '#10b981',
          deaths: '#6b7280'
        }
    }
  }

  const colors = getDiseaseColors(results.disease_name)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const day = label
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">Day {day}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {entry.dataKey}:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {entry.value?.toLocaleString() || 0}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-red-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Infections</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(results.results.summary.peak_infection).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-blue-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Infected</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(results.results.summary.total_infected).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-green-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Attack Rate</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {(results.results.summary.attack_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-500 rounded mr-2"></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Deaths</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(results.results.summary.total_deaths).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Simulation Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {results.disease_name} Disease Progression ({results.duration_days}-day forecast)
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#666' }}
                stroke={theme === 'dark' ? '#6b7280' : '#666'}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                formatter={(value, name) => [value.toLocaleString(), name]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="susceptible"
                stackId="1"
                stroke="none"
                fill="#e5e7eb"
                name="Susceptible"
              />
              {results.results.exposed && (
                <Area
                  type="monotone"
                  dataKey="exposed"
                  stackId="1"
                  stroke="none"
                  fill="#fbbf24"
                  name="Exposed"
                />
              )}
              <Area
                type="monotone"
                dataKey="infected"
                stackId="1"
                stroke="none"
                fill={colors.primary}
                name="Infected"
              />
              <Area
                type="monotone"
                dataKey="recovered"
                stackId="1"
                stroke="none"
                fill="#10b981"
                name="Recovered"
              />
              <Line 
                type="monotone" 
                dataKey="deaths" 
                stroke="#6b7280" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Deaths"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}