import React from 'react'
import { MapPin, AlertTriangle } from 'lucide-react'

interface MapFallbackProps {
  selectedTracts: string[]
  selectedFacilities: any[]
  onTractSelection?: (selectedTracts: string[]) => void
  onFacilitySelection?: (selectedFacilities: any[]) => void
}

export function MapFallback({ 
  selectedTracts, 
  selectedFacilities, 
  onTractSelection, 
  onFacilitySelection 
}: MapFallbackProps) {
  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
          disabled
        >
          Enable Selection (Unavailable)
        </button>
        
        {selectedTracts.length > 0 && (
          <button 
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => {
              onTractSelection?.([])
              onFacilitySelection?.([])
            }}
          >
            Clear Selection ({selectedTracts.length})
          </button>
        )}
      </div>

      {/* Layer Selection */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">Data Layer:</span>
        {[
          { key: 'poverty', label: 'Poverty Rate' },
          { key: 'race', label: 'Race Demographics' },
          { key: 'demographics', label: 'Population' },
          { key: 'community_risk', label: 'Community Risk' },
          { key: 'disability', label: 'Disability' }
        ].map(layer => (
          <button
            key={layer.key}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Fallback Map Display */}
      <div className="h-96 border rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
        <div className="text-center z-10 max-w-md">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Map Loading Error</h4>
          <p className="text-gray-600 mb-4">
            There was an error loading the interactive map. Please refresh the page or check your internet connection.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p><strong>Leaflet maps work in all modern browsers:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chrome, Firefox, Safari, Edge</li>
              <li>Mobile browsers</li>
              <li>No special requirements</li>
            </ul>
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-blue-200 rounded-full opacity-20"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-indigo-200 rounded-full opacity-20"></div>
        <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-purple-200 rounded-full opacity-20"></div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          <span>Child Care Centers</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
          <span>Nursing Homes</span>
        </div>
      </div>
    </div>
  )
}
