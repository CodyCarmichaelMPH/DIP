import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from './ui/Button'
import { MapFallback } from './MapFallback'
import { MapPin, Users, Home, Building2, X, Square } from 'lucide-react'
import { 
  loadCensusTracts, 
  loadChildCareCenters, 
  loadNursingHomes,
  loadPovertyData,
  loadRaceData,
  loadDemographicsData,
  loadCommunityRiskData,
  loadDisabilityData,
  mergeTractData,
  getTractColor,
  getTractOpacity,
  type CensusTract,
  type Facility
} from '../lib/mapData'

// Declare Leaflet as global
declare global {
  interface Window {
    L: any
  }
}

interface WashingtonMapProps {
  onTractSelection?: (selectedTracts: string[]) => void
  onFacilitySelection?: (selectedFacilities: Facility[]) => void
  onFacilityDataChange?: (childCareCenters: Facility[], nursingHomes: Facility[]) => void
  onCensusTractDataChange?: (censusTracts: CensusTract[]) => void
}

export function WashingtonMap({ onTractSelection, onFacilitySelection, onFacilityDataChange, onCensusTractDataChange }: WashingtonMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [selectedTracts, setSelectedTracts] = useState<string[]>([])
  const [selectedFacilities, setSelectedFacilities] = useState<Facility[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [activeLayer, setActiveLayer] = useState<string>('poverty')
  const [showChildCare, setShowChildCare] = useState(false)
  const [showNursingHomes, setShowNursingHomes] = useState(false)
  
  // Data states
  const [censusTracts, setCensusTracts] = useState<CensusTract[]>([])
  const [childCareCenters, setChildCareCenters] = useState<Facility[]>([])
  const [nursingHomes, setNursingHomes] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [mapSupported, setMapSupported] = useState(true)

  // Load map data
  const loadMapData = async () => {
    try {
      setLoading(true)
      console.log('Loading map data...')
      
      const [tracts, childCare, nursingHomes, povertyData, raceData, demographicsData, communityRiskData, disabilityData] = await Promise.all([
        loadCensusTracts(),
        loadChildCareCenters(),
        loadNursingHomes(),
        loadPovertyData(),
        loadRaceData(),
        loadDemographicsData(),
        loadCommunityRiskData(),
        loadDisabilityData()
      ])

      console.log('Loaded data:', {
        tracts: tracts.length,
        childCare: childCare.length,
        nursingHomes: nursingHomes.length,
        povertyData: povertyData.length
      })

      const tractsWithPoverty = mergeTractData(tracts, povertyData, 'poverty')
      const tractsWithRace = mergeTractData(tractsWithPoverty, raceData, 'race')
      const tractsWithDemographics = mergeTractData(tractsWithRace, demographicsData, 'demographics')
      const tractsWithCommunityRisk = mergeTractData(tractsWithDemographics, communityRiskData, 'community_risk')
      const tractsWithDisability = mergeTractData(tractsWithCommunityRisk, disabilityData, 'disability')

      console.log('Final tracts with data:', tractsWithDisability.length)
      setCensusTracts(tractsWithDisability)
      setChildCareCenters(childCare)
      setNursingHomes(nursingHomes)
      
      // Notify parent component of facility data
      onFacilityDataChange?.(childCare, nursingHomes)
      onCensusTractDataChange?.(tractsWithDisability)

    } catch (error) {
      console.error('Error loading map data:', error)
      setCensusTracts([])
      setChildCareCenters([])
      setNursingHomes([])
    } finally {
      setLoading(false)
    }
  }

  // Initialize map and load data
  useEffect(() => {
    // Check if Leaflet is available
    if (typeof window === 'undefined' || !window.L) {
      setMapSupported(false)
      return
    }

    loadMapData()
  }, [])

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

  // Initialize map when data is loaded
  useEffect(() => {
    console.log('Map effect triggered:', {
      censusTracts: censusTracts.length,
      mapRef: !!mapRef.current,
      leaflet: !!window.L
    })
    
    if (!censusTracts.length || !mapRef.current || !window.L) {
      console.log('Missing requirements for map initialization')
      return
    }

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      console.log('Initializing map...')
      mapInstanceRef.current = window.L.map(mapRef.current).setView([47.6062, -122.3321], 10)
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)
      console.log('Map initialized successfully')
    }

    // Clear existing GeoJSON layers and facility markers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.GeoJSON || layer._facilityMarker) {
        mapInstanceRef.current.removeLayer(layer)
      }
    })

    // Create GeoJSON layer for census tracts
    const tractsGeoJSON = {
      type: 'FeatureCollection',
      features: censusTracts
    }

    console.log('Creating GeoJSON layer with', censusTracts.length, 'tracts')
    const tractsLayer = window.L.geoJSON(tractsGeoJSON, {
      onEachFeature: function(feature: any, layer: any) {
        const geoid = feature.properties.GEOID20
        const isSelected = selectedTracts.includes(geoid)
        
        // Set initial style
        layer.setStyle({
          fillColor: getTractColor(feature.properties, activeLayer, selectedTracts),
          fillOpacity: getTractOpacity(feature.properties, selectedTracts),
          color: isSelected ? '#ef4444' : '#ffffff',
          weight: isSelected ? 3 : 1,
          dashArray: isSelected ? '5, 5' : undefined
        })

        // Add click handler
        layer.on('click', function(e: any) {
          if (isSelectionMode) {
            const isCurrentlySelected = selectedTracts.includes(geoid)
            let newSelectedTracts

            if (isCurrentlySelected) {
              // Remove from selection
              newSelectedTracts = selectedTracts.filter(id => id !== geoid)
              layer.setStyle({
                fillColor: getTractColor(feature.properties, activeLayer, newSelectedTracts),
                fillOpacity: getTractOpacity(feature.properties, newSelectedTracts),
                color: '#ffffff',
                weight: 1,
                dashArray: undefined
              })
            } else {
              // Add to selection
              newSelectedTracts = [...selectedTracts, geoid]
              layer.setStyle({
                fillColor: getTractColor(feature.properties, activeLayer, newSelectedTracts),
                fillOpacity: getTractOpacity(feature.properties, newSelectedTracts),
                color: '#ef4444',
                weight: 3,
                dashArray: '5, 5'
              })
            }

            setSelectedTracts(newSelectedTracts)
            onTractSelection?.(newSelectedTracts)
          }
        })

        // Add hover effects
        layer.on('mouseover', function(e: any) {
          if (!isSelectionMode) return
          
          layer.setStyle({
            weight: 3,
            color: '#3b82f6',
            fillOpacity: 0.7
          })
          
          if (!window.L.Browser.ie && !window.L.Browser.opera && !window.L.Browser.edge) {
            layer.bringToFront()
          }
        })

        layer.on('mouseout', function(e: any) {
          if (!isSelectionMode) return
          
          const isCurrentlySelected = selectedTracts.includes(geoid)
          layer.setStyle({
            fillColor: getTractColor(feature.properties, activeLayer, selectedTracts),
            fillOpacity: getTractOpacity(feature.properties, selectedTracts),
            color: isCurrentlySelected ? '#ef4444' : '#ffffff',
            weight: isCurrentlySelected ? 3 : 1,
            dashArray: isCurrentlySelected ? '5, 5' : undefined
          })
        })

        // Add popup
        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-sm">Census Tract ${geoid}</h3>
            <div class="text-xs text-gray-600 mt-1">
              ${activeLayer === 'poverty' ? `Poverty Rate: ${(feature.properties.poverty_rate * 100).toFixed(1)}%` : ''}
              ${activeLayer === 'race' ? `White Population: ${((feature.properties.white_alone / feature.properties.total_race_population) * 100).toFixed(1)}%` : ''}
              ${activeLayer === 'demographics' ? `Total Population: ${feature.properties.total_race_population}` : ''}
            </div>
          </div>
        `
        layer.bindPopup(popupContent)
      }
    }).addTo(mapInstanceRef.current)

    // Add facility markers only when toggled on
    if (showChildCare) {
      childCareCenters.forEach((facility, index) => {
        const [lng, lat] = facility.geometry.coordinates
        const isSelected = selectedFacilities.some(f => f.properties.NAME === facility.properties.NAME)
        
        const marker = window.L.marker([lat, lng], {
          icon: window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="facility-marker child-care ${isSelected ? 'selected' : ''}">🏠</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapInstanceRef.current)

        // Mark as facility marker for cleanup
        marker._facilityMarker = true

        marker.on('click', function() {
          const isCurrentlySelected = selectedFacilities.some(f => f.properties.NAME === facility.properties.NAME)
          let newSelectedFacilities

          if (isCurrentlySelected) {
            newSelectedFacilities = selectedFacilities.filter(f => f.properties.NAME !== facility.properties.NAME)
          } else {
            newSelectedFacilities = [...selectedFacilities, facility]
          }

          setSelectedFacilities(newSelectedFacilities)
          onFacilitySelection?.(newSelectedFacilities)
        })

        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-sm">${facility.properties.NAME}</h3>
            <div class="text-xs text-gray-600 mt-1">
              <div>Type: ${facility.properties.TYPE}</div>
              <div>Population: ${facility.properties.POPULATION || 'N/A'}</div>
              <div>City: ${facility.properties.CITY}, ${facility.properties.STATE}</div>
            </div>
          </div>
        `
        marker.bindPopup(popupContent)
      })
    }

    if (showNursingHomes) {
      nursingHomes.forEach((facility, index) => {
        const [lng, lat] = facility.geometry.coordinates
        const isSelected = selectedFacilities.some(f => f.properties.NAME === facility.properties.NAME)
        
        const marker = window.L.marker([lat, lng], {
          icon: window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="facility-marker nursing-home ${isSelected ? 'selected' : ''}">🏥</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapInstanceRef.current)

        // Mark as facility marker for cleanup
        marker._facilityMarker = true

        marker.on('click', function() {
          const isCurrentlySelected = selectedFacilities.some(f => f.properties.NAME === facility.properties.NAME)
          let newSelectedFacilities

          if (isCurrentlySelected) {
            newSelectedFacilities = selectedFacilities.filter(f => f.properties.NAME !== facility.properties.NAME)
          } else {
            newSelectedFacilities = [...selectedFacilities, facility]
          }

          setSelectedFacilities(newSelectedFacilities)
          onFacilitySelection?.(newSelectedFacilities)
        })

        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-sm">${facility.properties.NAME}</h3>
            <div class="text-xs text-gray-600 mt-1">
              <div>Type: ${facility.properties.TYPE}</div>
              <div>Residents: ${facility.properties.TOT_RES || 'N/A'}</div>
              <div>Beds: ${facility.properties.BEDS || 'N/A'}</div>
              <div>City: ${facility.properties.CITY}, ${facility.properties.STATE}</div>
            </div>
          </div>
        `
        marker.bindPopup(popupContent)
      })
    }

  }, [censusTracts, childCareCenters, nursingHomes, selectedTracts, selectedFacilities, isSelectionMode, activeLayer, showChildCare, showNursingHomes, onTractSelection, onFacilitySelection])

  // Cleanup function
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTracts([])
    setSelectedFacilities([])
    onTractSelection?.([])
    onFacilitySelection?.([])
  }, [onTractSelection, onFacilitySelection])

  if (!mapSupported) {
    return (
      <MapFallback
        selectedTracts={selectedTracts}
        selectedFacilities={selectedFacilities}
        onTractSelection={onTractSelection}
        onFacilitySelection={onFacilitySelection}
      />
    )
  }

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setIsSelectionMode(!isSelectionMode)}
          variant={isSelectionMode ? 'primary' : 'secondary'}
          size="sm"
        >
          {isSelectionMode ? 'Disable Selection' : 'Enable Selection'}
        </Button>
        
        {selectedTracts.length > 0 && (
          <Button onClick={clearSelection} variant="outline" size="sm">
            <X className="h-4 w-4 mr-1" />
            Clear Selection ({selectedTracts.length})
          </Button>
        )}

        <div className="flex gap-1 ml-auto">
          <Button
            onClick={() => setShowChildCare(!showChildCare)}
            variant={showChildCare ? 'primary' : 'secondary'}
            size="sm"
          >
            <Home className="h-4 w-4 mr-1" />
            Child Care
          </Button>
          <Button
            onClick={() => setShowNursingHomes(!showNursingHomes)}
            variant={showNursingHomes ? 'primary' : 'secondary'}
            size="sm"
          >
            <Building2 className="h-4 w-4 mr-1" />
            Nursing Homes
          </Button>
        </div>
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
          <Button
            key={layer.key}
            onClick={() => setActiveLayer(layer.key)}
            variant={activeLayer === layer.key ? 'primary' : 'outline'}
            size="sm"
          >
            {layer.label}
          </Button>
        ))}
      </div>

      {/* Map */}
      <div className="h-96 border rounded-lg overflow-hidden">
        <div ref={mapRef} className="w-full h-full"></div>
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
