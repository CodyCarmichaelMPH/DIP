import React from 'react'
import { BarChart3, Play, Search, Map, AlertTriangle, Info } from 'lucide-react'

export function Introduction() {
  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard',
      description: 'Real-time disease surveillance and modeling dashboard with interactive charts, vaccination coverage data, and simulation results.',
      features: [
        'Disease surveillance data',
        'SEIR and Starsim modeling',
        'Vaccination coverage analysis',
        'Interactive data visualizations'
      ]
    },
    {
      icon: Play,
      title: 'Scenario Builder',
      description: 'Create and run custom disease modeling scenarios with configurable parameters and real-time simulation results.',
      features: [
        'Custom parameter configuration',
        'Real-time simulation execution',
        'Scenario saving and sharing',
        'SEIR and Starsim models'
      ]
    },
    {
      icon: Search,
      title: 'SILAS (Researcher)',
      description: 'AI-powered research assistant for epidemiological analysis, data interpretation, and evidence-based insights.',
      features: [
        'AI-powered research assistance',
        'Evidence-based analysis',
        'Source citation and grading'
      ]
    },
    {
      icon: Map,
      title: 'Map View (Alpha)',
      description: 'Geographic visualization of disease data, facility locations, and spatial analysis tools.',
      features: [
        'Interactive geographic map',
        'Facility location data',
        'Spatial disease analysis (PENDING DEVELOPMENT)',
        'Layer-based visualization (PENDING DEVELOPMENT)'
      ]
    }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Introduction
        </h1>
        
        {/* Development Status Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
            <span className="text-amber-800 dark:text-amber-200 font-medium">
              This application is currently in active development
            </span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.features.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Getting Started
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Welcome to the Disease Intelligence Program! This comprehensive platform provides tools for disease surveillance, 
              modeling, and analysis. Each tab offers specialized functionality to support epidemiological research and 
              public health decision-making.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Start:</h4>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• Explore the Dashboard for real-time data</li>
                  <li>• Create scenarios in Scenario Builder</li>
                  <li>• Ask questions in SILAS Researcher</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Key Features:</h4>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• Real-time disease surveillance</li>
                  <li>• Advanced modeling capabilities</li>
                  <li>• AI-powered research assistance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Future Features */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
        <div className="flex items-start">
          <Info className="h-6 w-6 text-green-600 dark:text-green-400 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              Future Features
            </h3>
            <p className="text-green-800 dark:text-green-200 mb-4">
              We're continuously developing new capabilities to enhance the Disease Intelligence Program. Here's what's coming next:
            </p>
            <ul className="space-y-2 text-green-800 dark:text-green-200">
              <li>• AI Assisted Leadership Brief creation</li>
              <li>• Spatial Disease Analysis</li>
              <li>• Layer Based Visualization</li>
              <li>• Person Travel Visualizations</li>
              <li>• Jurisdiction Selection</li>
              <li>• and more!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Introduction() {
  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard',
      description: 'Real-time disease surveillance and modeling dashboard with interactive charts, vaccination coverage data, and simulation results.',
      features: [
        'Disease surveillance data',
        'SEIR and Starsim modeling',
        'Vaccination coverage analysis',
        'Interactive data visualizations'
      ]
    },
    {
      icon: Play,
      title: 'Scenario Builder',
      description: 'Create and run custom disease modeling scenarios with configurable parameters and real-time simulation results.',
      features: [
        'Custom parameter configuration',
        'Real-time simulation execution',
        'Scenario saving and sharing',
        'SEIR and Starsim models'
      ]
    },
    {
      icon: Search,
      title: 'SILAS (Researcher)',
      description: 'AI-powered research assistant for epidemiological analysis, data interpretation, and evidence-based insights.',
      features: [
        'AI-powered research assistance',
        'Evidence-based analysis',
        'Source citation and grading'
      ]
    },
    {
      icon: Map,
      title: 'Map View (Alpha)',
      description: 'Geographic visualization of disease data, facility locations, and spatial analysis tools.',
      features: [
        'Interactive geographic map',
        'Facility location data',
        'Spatial disease analysis (PENDING DEVELOPMENT)',
        'Layer-based visualization (PENDING DEVELOPMENT)'
      ]
    }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Introduction
        </h1>
        
        {/* Development Status Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
            <span className="text-amber-800 dark:text-amber-200 font-medium">
              This application is currently in active development
            </span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.features.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Getting Started
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Welcome to the Disease Intelligence Program! This comprehensive platform provides tools for disease surveillance, 
              modeling, and analysis. Each tab offers specialized functionality to support epidemiological research and 
              public health decision-making.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Start:</h4>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• Explore the Dashboard for real-time data</li>
                  <li>• Create scenarios in Scenario Builder</li>
                  <li>• Ask questions in SILAS Researcher</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Key Features:</h4>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• Real-time disease surveillance</li>
                  <li>• Advanced modeling capabilities</li>
                  <li>• AI-powered research assistance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Future Features */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
        <div className="flex items-start">
          <Info className="h-6 w-6 text-green-600 dark:text-green-400 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              Future Features
            </h3>
            <p className="text-green-800 dark:text-green-200 mb-4">
              We're continuously developing new capabilities to enhance the Disease Intelligence Program. Here's what's coming next:
            </p>
            <ul className="space-y-2 text-green-800 dark:text-green-200">
              <li>• AI Assisted Leadership Brief creation</li>
              <li>• Spatial Disease Analysis</li>
              <li>• Layer Based Visualization</li>
              <li>• Person Travel Visualizations</li>
              <li>• Jurisdiction Selection</li>
              <li>• and more!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}



