import React, { useMemo } from 'react'
import { Building2, Home, Users, MapPin } from 'lucide-react'

interface Facility {
  type: 'Feature'
  properties: {
    NAME: string
    TYPE: string
    POPULATION?: number
    TOT_RES?: number
    BEDS?: number
    LATITUDE: number
    LONGITUDE: number
    [key: string]: any
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

interface FacilityRiskOverviewProps {
  selectedTracts: string[]
  childCareCenters: Facility[]
  nursingHomes: Facility[]
  selectedFacilities: Facility[]
  censusTracts?: any[] // Add census tracts for spatial intersection
}

export function FacilityRiskOverview({ 
  selectedTracts, 
  childCareCenters, 
  nursingHomes, 
  selectedFacilities,
  censusTracts = []
}: FacilityRiskOverviewProps) {
  
  // Spatial intersection function to check if a point is inside a polygon
  const isPointInPolygon = (point: [number, number], polygon: number[][]) => {
    const [x, y] = point
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    
    return inside
  }

  // Check if facility is in selected tracts
  const isFacilityInSelectedTracts = (facility: Facility, selectedTracts: string[]) => {
    if (selectedTracts.length === 0) return true
    
    const [lng, lat] = facility.geometry.coordinates
    
    return selectedTracts.some(tractId => {
      const tract = censusTracts.find(t => t.properties.GEOID20 === tractId)
      if (!tract) return false
      
      if (tract.geometry.type === 'Polygon') {
        return isPointInPolygon([lng, lat], tract.geometry.coordinates[0])
      } else if (tract.geometry.type === 'MultiPolygon') {
        return tract.geometry.coordinates.some(polygon => 
          isPointInPolygon([lng, lat], polygon[0])
        )
      }
      return false
    })
  }

  // Filter facilities based on selected tracts
  const relevantFacilities = useMemo(() => {
    if (selectedTracts.length === 0) {
      // If no tracts selected, show all facilities
      return {
        childCare: childCareCenters,
        nursingHomes: nursingHomes
      }
    }
    
    // Filter facilities that are in selected tracts
    return {
      childCare: childCareCenters.filter(facility => isFacilityInSelectedTracts(facility, selectedTracts)),
      nursingHomes: nursingHomes.filter(facility => isFacilityInSelectedTracts(facility, selectedTracts))
    }
  }, [selectedTracts, childCareCenters, nursingHomes])

  // Get most populous facilities
  const mostPopulousChildCare = useMemo(() => {
    return relevantFacilities.childCare
      .filter(facility => facility.properties.POPULATION && facility.properties.POPULATION > 0)
      .sort((a, b) => (b.properties.POPULATION || 0) - (a.properties.POPULATION || 0))
      .slice(0, 5)
  }, [relevantFacilities.childCare])

  const mostPopulousNursingHomes = useMemo(() => {
    return relevantFacilities.nursingHomes
      .filter(facility => facility.properties.TOT_RES && facility.properties.TOT_RES > 0)
      .sort((a, b) => (b.properties.TOT_RES || 0) - (a.properties.TOT_RES || 0))
      .slice(0, 5)
  }, [relevantFacilities.nursingHomes])

  const getRiskLevel = (population: number) => {
    if (population >= 100) return { level: 'high', color: 'text-red-600', bg: 'bg-red-100' }
    if (population >= 50) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'low', color: 'text-green-600', bg: 'bg-green-100' }
  }

  return (
    <div className="space-y-6">
      {/* Child Care Centers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center mb-4">
          <Home className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Most Populous Child Care Centers</h3>
        </div>
        
        {mostPopulousChildCare.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Home className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No child care centers with population data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mostPopulousChildCare.map((facility, index) => {
              const population = facility.properties.POPULATION || 0
              const risk = getRiskLevel(population)
              const isSelected = selectedFacilities.some(f => f.properties.NAME === facility.properties.NAME)
              
              return (
                <div 
                  key={`childcare-${index}`}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{facility.properties.NAME}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {facility.properties.TYPE?.replace('_', ' ').toLowerCase()}
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      {facility.properties.CITY}, {facility.properties.STATE}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      {population} residents
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${risk.bg} ${risk.color}`}>
                      {risk.level}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nursing Homes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center mb-4">
          <Building2 className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Most Populous Nursing Homes</h3>
        </div>
        
        {mostPopulousNursingHomes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No nursing homes with population data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mostPopulousNursingHomes.map((facility, index) => {
              const population = facility.properties.TOT_RES || 0
              const risk = getRiskLevel(population)
              const isSelected = selectedFacilities.some(f => f.properties.NAME === facility.properties.NAME)
              
              return (
                <div 
                  key={`nursing-${index}`}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{facility.properties.NAME}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {facility.properties.TYPE?.replace('_', ' ').toLowerCase()}
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      {facility.properties.CITY}, {facility.properties.STATE}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      {population} residents
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${risk.bg} ${risk.color}`}>
                      {risk.level}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Selection Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Selected Tracts:</span>
            <span className="ml-2 font-medium text-gray-900">
              {selectedTracts.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Selected Facilities:</span>
            <span className="ml-2 font-medium text-gray-900">
              {selectedFacilities.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Child Care Centers:</span>
            <span className="ml-2 font-medium text-gray-900">
              {relevantFacilities.childCare.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Nursing Homes:</span>
            <span className="ml-2 font-medium text-gray-900">
              {relevantFacilities.nursingHomes.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
