// PREPARESMap.tsx - Interactive Leaflet map component following PREPARES pattern
// Displays Washington State census tracts and handles tract selection via clicks
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker, LayersControl, Marker, LayerGroup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Declare proj4 as global
declare global {
  interface Window {
    proj4: any;
  }
}

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PREPARESMapProps {
  selectedTracts: string[];
  onTractSelect: (geoid20: string) => void;
  onFacilityDataChange?: (childCareCenters: any[], nursingHomes: any[]) => void;
  onCensusTractDataChange?: (tracts: any[]) => void;
}

// Component to handle map interactions
const MapInteractions: React.FC<{
  tractsData: any;
  selectedTracts: string[];
  onTractSelect: (geoid20: string) => void;
}> = ({ tractsData, selectedTracts, onTractSelect }) => {
  const map = useMap();

  useEffect(() => {
    if (!tractsData || !tractsData.features || tractsData.features.length === 0) {
      console.log('No tracts data available for bounds fitting');
      return;
    }
    
    // Skip bounds fitting for now to avoid errors - just set default view
    console.log('Setting default view instead of fitting bounds to avoid errors');
    map.setView([47.6062, -122.3321], 9);
    
    // TODO: Re-enable bounds fitting once coordinate transformation is working properly
    /*
    try {
      console.log('Attempting to fit bounds for tracts data...');
      console.log('Tracts data features count:', tractsData.features.length);
      console.log('First feature after transformation:', tractsData.features[0]);
      
      const geoJsonLayer = L.geoJSON(tractsData);
      const bounds = geoJsonLayer.getBounds();
      
      console.log('Calculated bounds:', bounds);
      console.log('Bounds isValid():', bounds.isValid());
      
      // Check if bounds are valid
      if (bounds.isValid()) {
        console.log('Fitting bounds successfully');
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        console.warn('Invalid bounds for tracts data, using default view');
        console.log('Bounds details:', {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        });
        map.setView([47.6062, -122.3321], 9);
      }
    } catch (error) {
      console.error('Error fitting bounds:', error);
      console.log('Using default view due to error');
      map.setView([47.6062, -122.3321], 9);
    }
    */
  }, [tractsData, map]);

  const onEachFeature = (feature: any, layer: L.Path) => {
    const geoid20 = feature.properties.GEOID || feature.properties.GEOID20;
    layer.on('click', () => {
      onTractSelect(geoid20);
    });
  };

  const style = (feature: any) => {
    if (!feature || !feature.properties) return {};
    const geoid20 = feature.properties.GEOID || feature.properties.GEOID20;
    return {
      fillColor: selectedTracts.includes(geoid20) ? '#ff4444' : '#3388ff',
      weight: selectedTracts.includes(geoid20) ? 3 : 1,
      opacity: 1,
      color: selectedTracts.includes(geoid20) ? '#ff4444' : '#ffffff',
      fillOpacity: selectedTracts.includes(geoid20) ? 0.7 : 0.6
    };
  };

  if (!tractsData) return null;

  return (
    <GeoJSON
      data={tractsData}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
};

// Coordinate transformation functions
const candidateDefs = [
  { code: 'EPSG:2926', def: '+proj=lcc +lat_1=47.33333333333334 +lat_2=45.83333333333334 +lat_0=45.33333333333334 +lon_0=-120.5 +x_0=0 +y_0=0 +datum=NAD83 +units=us-ft +no_defs' }, // WA South ft
  { code: 'EPSG:2927', def: '+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47 +lon_0=-120.8333333333333 +x_0=0 +y_0=0 +datum=NAD83 +units=us-ft +no_defs' }, // WA North ft
  { code: 'EPSG:2285', def: '+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47 +lon_0=-120.8333333333333 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs' }, // WA North m
  { code: 'EPSG:2286', def: '+proj=lcc +lat_1=47.33333333333334 +lat_2=45.83333333333334 +lat_0=45.33333333333334 +lon_0=-120.5 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs' }, // WA South m
];

const ensureDefs = () => {
  if (!window.proj4) {
    console.error('proj4 not available on window');
    return;
  }
  console.log('Registering projection definitions...');
  for (const c of candidateDefs) {
    try {
      const existing = (window.proj4 as any).defs(c.code);
      if (!existing) {
        (window.proj4 as any).defs(c.code, c.def);
        console.log('Registered projection:', c.code);
      } else {
        console.log('Projection already registered:', c.code);
      }
    } catch (e) {
      console.error('Error registering projection', c.code, ':', e);
    }
  }
};

const tryTransformSample = (g: any, code: string): { ok: boolean, bbox?: [number, number, number, number] } => {
  try {
    const proj = (window.proj4 as any);
    const to = 'EPSG:4326';
    const pts: [number, number][] = [];
    if (g.type === 'Polygon') {
      const ring = g.coordinates[0];
      for (let i = 0; i < ring.length; i += Math.ceil(ring.length / 5)) pts.push(ring[i]);
    } else if (g.type === 'MultiPolygon') {
      const ring = g.coordinates[0][0];
      for (let i = 0; i < ring.length; i += Math.ceil(ring.length / 5)) pts.push(ring[i]);
    } else {
      return { ok: false };
    }
    const ll = pts.map(([x, y]) => proj(code, to, [x, y]));
    const lons = ll.map(p => p[0]);
    const lats = ll.map(p => p[1]);
    const bbox: [number, number, number, number] = [
      Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)
    ];
    // WA bounds approx: lon -125..-116, lat 45..49.5
    const ok = bbox[0] >= -125.5 && bbox[2] <= -116 && bbox[1] >= 45 && bbox[3] <= 49.8;
    return { ok, bbox };
  } catch {
    return { ok: false };
  }
};

const chooseProjection = (feature: any): string | null => {
  console.log('Choosing projection for feature:', feature.properties?.GEOID20);
  ensureDefs();
  for (const c of candidateDefs) {
    console.log('Trying projection:', c.code);
    const res = tryTransformSample(feature.geometry, c.code);
    console.log('Result for', c.code, ':', res);
    if (res.ok) {
      console.log('Selected projection:', c.code);
      return c.code;
    }
  }
  console.log('No suitable projection found');
  return null;
};

const transformGeometry = (geometry: any, code: string): any => {
  console.log('Transforming geometry type:', geometry.type, 'with code:', code);
  const proj = (window.proj4 as any);
  if (geometry.type === 'Polygon') {
    const transformed = {
      type: 'Polygon',
      coordinates: (geometry.coordinates as number[][][]).map(ring =>
        ring.map(([x, y]) => proj(code, 'EPSG:4326', [x, y]))
      )
    };
    console.log('Transformed polygon sample:', transformed.coordinates[0][0]);
    return transformed;
  }
  if (geometry.type === 'MultiPolygon') {
    const transformed = {
      type: 'MultiPolygon',
      coordinates: (geometry.coordinates as number[][][][]).map(poly =>
        poly.map(ring => ring.map(([x, y]) => proj(code, 'EPSG:4326', [x, y])))
      )
    };
    console.log('Transformed multipolygon sample:', transformed.coordinates[0][0][0]);
    return transformed;
  }
  return geometry;
};

const PREPARESMap: React.FC<PREPARESMapProps> = ({ 
  selectedTracts, 
  onTractSelect, 
  onFacilityDataChange,
  onCensusTractDataChange 
}) => {
  const [tractsData, setTractsData] = useState<any>(null);
  const [childCareCenters, setChildCareCenters] = useState<any>(null);
  const [nursingHomes, setNursingHomes] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading map data...');
        
        // Load census tracts
        const tractsResponse = await fetch('/washington_tracts_base_optimized.geojson');
        if (!tractsResponse.ok) {
          throw new Error(`Failed to load census tracts: ${tractsResponse.status}`);
        }
        const tracts = await tractsResponse.json();
        console.log('Census tracts loaded:', tracts.features?.length || 0, 'features');
        console.log('First feature sample:', tracts.features?.[0]);
        console.log('Tracts data structure:', tracts);
        
        // Check if coordinates need transformation
        const firstFeature = tracts.features?.[0];
        const sampleCoord = firstFeature?.geometry?.coordinates?.[0]?.[0];
        console.log('Sample coordinate from first feature:', sampleCoord);
        console.log('proj4 available on window:', typeof window.proj4 !== 'undefined');
        
        let transformedTracts = tracts;
        
        // If coordinates look like they're in a projected system (large numbers, not lat/lon)
        if (sampleCoord && (Math.abs(sampleCoord[0]) > 180 || Math.abs(sampleCoord[1]) > 90)) {
          console.log('Coordinates appear to be projected, attempting transformation...');
          
          if (!window.proj4) {
            console.warn('proj4 not available, cannot transform coordinates. Using raw data.');
            console.log('Available on window:', Object.keys(window).filter(k => k.includes('proj')));
          } else {
            // Decide projection from first feature
            console.log('Choosing projection...');
            const chosen = chooseProjection(tracts.features[0]);
            console.log('Chosen projection:', chosen);

            if (chosen) {
              transformedTracts = {
                type: 'FeatureCollection',
                features: tracts.features.map((f: any) => ({
                  type: 'Feature',
                  properties: f.properties,
                  geometry: transformGeometry(f.geometry, chosen)
                }))
              };
              console.log('Transformation completed');
              console.log('Sample transformed coordinates:', transformedTracts.features[0]?.geometry?.coordinates?.[0]?.[0]);
            } else {
              console.warn('No suitable projection found, using raw data');
            }
          }
        } else {
          console.log('Coordinates appear to be in WGS84, no transformation needed');
        }
        
        setTractsData(transformedTracts);
        
        // Pass census tract data to parent
        if (onCensusTractDataChange && tracts.features) {
          onCensusTractDataChange(tracts.features);
        }

        // Load child care centers
        const childCareResponse = await fetch('/Child_Care_Centers.geojson');
        const childCare = await childCareResponse.json();
        console.log('Child care centers loaded:', childCare.features?.length || 0, 'features');
        setChildCareCenters(childCare);

        // Load nursing homes
        const nursingResponse = await fetch('/Nursing_Homes.geojson');
        const nursing = await nursingResponse.json();
        console.log('Nursing homes loaded:', nursing.features?.length || 0, 'features');
        setNursingHomes(nursing);

        // Pass facility data to parent
        if (onFacilityDataChange) {
          onFacilityDataChange(
            childCare.features || [],
            nursing.features || []
          );
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading map data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [onFacilityDataChange, onCensusTractDataChange]);

  if (loading) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5',
        borderRadius: 8
      }}>
        <div>Loading map data...</div>
      </div>
    );
  }

  if (!tractsData || !tractsData.features || tractsData.features.length === 0) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5',
        borderRadius: 8
      }}>
        <div>No map data available</div>
      </div>
    );
  }

  console.log('Rendering map with tracts data:', tractsData.features.length, 'features');

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[47.6062, -122.3321]}
        zoom={9}
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LayersControl position="topright">
          {/* Tracts polygons (always on) */}
          <LayersControl.BaseLayer checked name="Census Tracts">
            <MapInteractions
              tractsData={tractsData}
              selectedTracts={selectedTracts}
              onTractSelect={onTractSelect}
            />
          </LayersControl.BaseLayer>
          
          {/* Child Care Centers overlay */}
          <LayersControl.Overlay name="Child Care Centers">
            {childCareCenters && childCareCenters.features && (
              <LayerGroup>
                {childCareCenters.features.map((feature: any, idx: number) => {
                  const coords = feature.geometry?.coordinates;
                  if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
                  const name = feature.properties?.NAME || feature.properties?.FACILITY_NAME || '';
                  return (
                    <Marker
                      key={idx}
                      position={[coords[1], coords[0]]}
                      icon={new L.DivIcon({
                        html: '<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                        className: '',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}
                      eventHandlers={{
                        click: (e) => {
                          (e.target as any).bindPopup(`<b>Child Care Center</b><br/>${name}`).openPopup();
                        }
                      }}
                    />
                  );
                })}
              </LayerGroup>
            )}
          </LayersControl.Overlay>
          
          {/* Nursing Homes overlay */}
          <LayersControl.Overlay name="Nursing Homes">
            {nursingHomes && nursingHomes.features && (
              <LayerGroup>
                {nursingHomes.features.map((feature: any, idx: number) => {
                  const coords = feature.geometry?.coordinates;
                  if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
                  const name = feature.properties?.NAME || feature.properties?.FACILITY_NAME || '';
                  return (
                    <Marker
                      key={idx}
                      position={[coords[1], coords[0]]}
                      icon={new L.DivIcon({
                        html: '<div style="background-color: #FF9800; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                        className: '',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}
                      eventHandlers={{
                        click: (e) => {
                          (e.target as any).bindPopup(`<b>Nursing Home</b><br/>${name}`).openPopup();
                        }
                      }}
                    />
                  );
                })}
              </LayerGroup>
            )}
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
};

export default PREPARESMap;
