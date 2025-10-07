import React, { useState, useEffect, useRef } from 'react'

// Declare Leaflet & proj4 as global
declare global {
  interface Window {
    L: any
    proj4: any
  }
}

export function ExactMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [tractData, setTractData] = useState<any>(null)

  // Candidate projections commonly used for WA State Plane
  const candidateDefs = [
    { code: 'EPSG:2926', def: '+proj=lcc +lat_1=47.33333333333334 +lat_2=45.83333333333334 +lat_0=45.33333333333334 +lon_0=-120.5 +x_0=0 +y_0=0 +datum=NAD83 +units=us-ft +no_defs' }, // WA South ft
    { code: 'EPSG:2927', def: '+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47 +lon_0=-120.8333333333333 +x_0=0 +y_0=0 +datum=NAD83 +units=us-ft +no_defs' }, // WA North ft
    { code: 'EPSG:2285', def: '+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47 +lon_0=-120.8333333333333 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs' }, // WA North m
    { code: 'EPSG:2286', def: '+proj=lcc +lat_1=47.33333333333334 +lat_2=45.83333333333334 +lat_0=45.33333333333334 +lon_0=-120.5 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs' }, // WA South m
  ]

  const ensureDefs = () => {
    if (!window.proj4) {
      console.error('proj4 not available on window')
      return
    }
    console.log('Registering projection definitions...')
    for (const c of candidateDefs) {
      try {
        // Check if already defined
        const existing = (window.proj4 as any).defs(c.code)
        if (!existing) {
          (window.proj4 as any).defs(c.code, c.def)
          console.log('Registered projection:', c.code)
        } else {
          console.log('Projection already registered:', c.code)
        }
      } catch (e) {
        console.error('Error registering projection', c.code, ':', e)
      }
    }
  }

  const tryTransformSample = (g: any, code: string): { ok: boolean, bbox?: [number, number, number, number] } => {
    try {
      const proj = (window.proj4 as any)
      const to = 'EPSG:4326'
      // get a handful of sample points (first ring)
      const pts: [number, number][] = []
      if (g.type === 'Polygon') {
        const ring = g.coordinates[0]
        for (let i = 0; i < ring.length; i += Math.ceil(ring.length / 5)) pts.push(ring[i])
      } else if (g.type === 'MultiPolygon') {
        const ring = g.coordinates[0][0]
        for (let i = 0; i < ring.length; i += Math.ceil(ring.length / 5)) pts.push(ring[i])
      } else {
        return { ok: false }
      }
      const ll = pts.map(([x, y]) => proj(code, to, [x, y]))
      const lons = ll.map(p => p[0])
      const lats = ll.map(p => p[1])
      const bbox: [number, number, number, number] = [
        Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)
      ]
      // WA bounds approx: lon -125..-116, lat 45..49.5
      const ok = bbox[0] >= -125.5 && bbox[2] <= -116 && bbox[1] >= 45 && bbox[3] <= 49.8
      return { ok, bbox }
    } catch {
      return { ok: false }
    }
  }

  const chooseProjection = (feature: any): string | null => {
    console.log('Choosing projection for feature:', feature.properties?.GEOID20)
    ensureDefs()
    for (const c of candidateDefs) {
      console.log('Trying projection:', c.code)
      const res = tryTransformSample(feature.geometry, c.code)
      console.log('Result for', c.code, ':', res)
      if (res.ok) {
        console.log('Selected projection:', c.code)
        return c.code
      }
    }
    console.log('No suitable projection found')
    return null
  }

  const transformGeometry = (geometry: any, code: string): any => {
    console.log('Transforming geometry type:', geometry.type, 'with code:', code)
    const proj = (window.proj4 as any)
    if (geometry.type === 'Polygon') {
      const transformed = {
        type: 'Polygon',
        coordinates: (geometry.coordinates as number[][][]).map(ring =>
          ring.map(([x, y]) => proj(code, 'EPSG:4326', [x, y]))
        )
      }
      console.log('Transformed polygon sample:', transformed.coordinates[0][0])
      return transformed
    }
    if (geometry.type === 'MultiPolygon') {
      const transformed = {
        type: 'MultiPolygon',
        coordinates: (geometry.coordinates as number[][][][]).map(poly =>
          poly.map(ring => ring.map(([x, y]) => proj(code, 'EPSG:4326', [x, y])))
        )
      }
      console.log('Transformed multipolygon sample:', transformed.coordinates[0][0][0])
      return transformed
    }
    return geometry
  }

  // Load census tract data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching census tract data...')
        const response = await fetch('/washington_tracts_base_optimized.geojson')
        const data = await response.json()
        console.log('Census tract data loaded:', data.features?.length || 0, 'features')
        console.log('First feature sample:', data.features?.[0])
        setTractData(data)
      } catch (error) {
        console.error('Error loading map data:', error)
        setTractData({ type: 'FeatureCollection', features: [] })
      }
    }
    fetchData()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!tractData || !mapRef.current) return

    console.log('Initializing map with tract data...')
    console.log('proj4 available:', typeof window.proj4 !== 'undefined')
    console.log('Leaflet available:', typeof window.L !== 'undefined')

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView([47.5, -120.5], 6)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)
    }

    // Remove previous tracts
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.GeoJSON) {
        mapInstanceRef.current.removeLayer(layer)
      }
    })

    if (!Array.isArray(tractData.features) || tractData.features.length === 0) {
      console.log('No features to render')
      return
    }

    // Check if coordinates are already in WGS84 (longitude/latitude)
    const firstFeature = tractData.features[0]
    const sampleCoord = firstFeature?.geometry?.coordinates?.[0]?.[0]
    console.log('Sample coordinate from first feature:', sampleCoord)
    
    let transformed = tractData
    
    // If coordinates look like they're in a projected system (large numbers, not lat/lon)
    if (sampleCoord && (Math.abs(sampleCoord[0]) > 180 || Math.abs(sampleCoord[1]) > 90)) {
      console.log('Coordinates appear to be projected, attempting transformation...')
      
      if (!window.proj4) {
        console.warn('proj4 not available, cannot transform coordinates. Using raw data.')
      } else {
        // Decide projection from first feature
        console.log('Choosing projection...')
        const chosen = chooseProjection(tractData.features[0])
        console.log('Chosen projection:', chosen)

        if (chosen) {
          transformed = {
            type: 'FeatureCollection',
            features: tractData.features.map((f: any) => ({
              type: 'Feature',
              properties: f.properties,
              geometry: transformGeometry(f.geometry, chosen)
            }))
          }
        } else {
          console.warn('No suitable projection found, using raw data')
        }
      }
    } else {
      console.log('Coordinates appear to be in WGS84, no transformation needed')
    }

    console.log('Adding GeoJSON layer to map...')
    const layer = window.L.geoJSON(transformed, {
      style: {
        fillColor: '#3388ff',
        fillOpacity: 0.6,
        color: '#ffffff',
        weight: 1
      }
    }).addTo(mapInstanceRef.current)

    console.log('GeoJSON layer added, fitting bounds...')
    try { 
      mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [10, 10] })
      console.log('Bounds fitted successfully')
    } catch (e) {
      console.log('Bounds fitting failed:', e)
    }

  }, [tractData])

  return (
    <div className="h-96 border rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full"></div>
    </div>
  )
}
