import React, { useEffect, useRef } from 'react'

// Declare Leaflet as global
declare global {
  interface Window {
    L: any
  }
}

export function SimpleMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    console.log('SimpleMap effect triggered')
    console.log('Leaflet available:', typeof window.L !== 'undefined')
    console.log('Map ref:', !!mapRef.current)

    if (!mapRef.current || !window.L) {
      console.log('Missing requirements for map initialization')
      return
    }

    // Initialize map
    console.log('Initializing simple map...')
    mapInstanceRef.current = window.L.map(mapRef.current).setView([47.6062, -122.3321], 10)
    
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current)
    
    console.log('Simple map initialized successfully')

    // Test loading census tracts
    fetch('/washington_tracts_base_optimized.geojson')
      .then(response => {
        console.log('Census tracts response status:', response.status)
        return response.json()
      })
      .then(data => {
        console.log('Census tracts loaded:', data.features?.length || 0)
        
        if (data.features && data.features.length > 0) {
          // Add GeoJSON layer
          const geoJsonLayer = window.L.geoJSON(data, {
            style: {
              fillColor: '#3388ff',
              fillOpacity: 0.6,
              color: '#ffffff',
              weight: 1
            }
          }).addTo(mapInstanceRef.current)
          
          console.log('GeoJSON layer added to map')
        } else {
          console.log('No features found in census tracts data')
        }
      })
      .catch(error => {
        console.error('Error loading census tracts:', error)
      })

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="h-96 border rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full"></div>
    </div>
  )
}
