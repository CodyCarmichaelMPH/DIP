// FacilityMap.tsx - Map with selectable facility layers
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different facility types
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const childCareIcon = createCustomIcon('#4CAF50'); // Green
const nursingHomeIcon = createCustomIcon('#FF9800'); // Orange  
const hospitalIcon = createCustomIcon('#F44336'); // Red

// Data loading functions
const loadChildCareCenters = async () => {
  try {
    const response = await fetch('/Child_Care_Centers.geojson');
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error loading child care centers:', error);
    return [];
  }
};

const loadNursingHomes = async () => {
  try {
    const response = await fetch('/Nursing_Homes.geojson');
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error loading nursing homes:', error);
    return [];
  }
};

const loadHospitals = async () => {
  try {
    const response = await fetch('/Hospitals_Locations.geojson');
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error loading hospitals:', error);
    return [];
  }
};

// Component to track map bounds and notify parent
const MapBoundsTracker: React.FC<{
  onBoundsChange: ((bounds: L.LatLngBounds) => void) | undefined;
}> = ({ onBoundsChange }) => {
  const map = useMap();

  useEffect(() => {
    if (!onBoundsChange) return;

    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    };

    // Initial bounds
    handleMoveEnd();

    // Listen for map movements
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
};

// Component to render facility markers
const FacilityMarkers: React.FC<{
  facilities: any[];
  icon: L.DivIcon;
  showLayer: boolean;
}> = ({ facilities, icon, showLayer }) => {
  if (!showLayer) return null;

  return (
    <>
      {facilities.map((facility, index) => {
        const coords = facility.geometry?.coordinates;
        if (!coords || coords.length !== 2) return null;

        const [lng, lat] = coords;
        const props = facility.properties || {};

        return (
          <Marker key={`${facility.properties?.ID || index}`} position={[lat, lng]} icon={icon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-2">{props.NAME || 'Unknown Facility'}</h3>
                <div className="text-xs space-y-1">
                  <p><strong>Type:</strong> {props.TYPE || 'N/A'}</p>
                  <p><strong>Address:</strong> {props.ADDRESS || 'N/A'}</p>
                  <p><strong>City:</strong> {props.CITY || 'N/A'}, {props.STATE || 'N/A'}</p>
                  {props.POPULATION && props.POPULATION !== -999 && (
                    <p><strong>Population:</strong> {props.POPULATION}</p>
                  )}
                  {props.BEDS && props.BEDS !== -999 && (
                    <p><strong>Beds:</strong> {props.BEDS}</p>
                  )}
                  {props.TOT_RES && props.TOT_RES !== -999 && (
                    <p><strong>Residents:</strong> {props.TOT_RES}</p>
                  )}
                  {props.TELEPHONE && props.TELEPHONE !== 'NOT AVAILABLE' && (
                    <p><strong>Phone:</strong> {props.TELEPHONE}</p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

interface FacilityMapProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  onFacilitiesLoad?: (facilities: {
    childCare: any[];
    nursing: any[];
    hospitals: any[];
  }) => void;
}

const FacilityMap: React.FC<FacilityMapProps> = ({ onBoundsChange, onFacilitiesLoad }) => {
  const [childCareCenters, setChildCareCenters] = useState<any[]>([]);
  const [nursingHomes, setNursingHomes] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showChildCare, setShowChildCare] = useState(false);
  const [showNursingHomes, setShowNursingHomes] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [childCare, nursing, hospital] = await Promise.all([
          loadChildCareCenters(),
          loadNursingHomes(),
          loadHospitals()
        ]);
        
        setChildCareCenters(childCare);
        setNursingHomes(nursing);
        setHospitals(hospital);
        
        // Notify parent component
        if (onFacilitiesLoad) {
          onFacilitiesLoad({
            childCare,
            nursing,
            hospitals: hospital
          });
        }
        
        console.log('Loaded facilities:', {
          childCare: childCare.length,
          nursing: nursing.length,
          hospitals: hospital.length
        });
      } catch (error) {
        console.error('Error loading facility data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [onFacilitiesLoad]);

  return (
    <div className="relative">
      {/* Layer Toggle Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 space-y-2">
        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Facility Layers</h4>
        
        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={showChildCare}
            onChange={(e) => setShowChildCare(e.target.checked)}
            className="rounded"
          />
          <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm"></div>
          <span>Child Care Centers ({childCareCenters.length})</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={showNursingHomes}
            onChange={(e) => setShowNursingHomes(e.target.checked)}
            className="rounded"
          />
          <div className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm"></div>
          <span>Nursing Homes ({nursingHomes.length})</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={showHospitals}
            onChange={(e) => setShowHospitals(e.target.checked)}
            className="rounded"
          />
          <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
          <span>Hospitals ({hospitals.length})</span>
        </label>
      </div>

      {/* Map Container */}
      <div style={{ height: '400px', width: '100%', position: 'relative', border: '1px solid #ccc' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading facilities...</p>
            </div>
          </div>
        ) : (
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
            
            {/* Track map bounds */}
            <MapBoundsTracker onBoundsChange={onBoundsChange} />
            
            {/* Facility Markers */}
            <FacilityMarkers
              facilities={childCareCenters}
              icon={childCareIcon}
              showLayer={showChildCare}
            />
            <FacilityMarkers
              facilities={nursingHomes}
              icon={nursingHomeIcon}
              showLayer={showNursingHomes}
            />
            <FacilityMarkers
              facilities={hospitals}
              icon={hospitalIcon}
              showLayer={showHospitals}
            />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default FacilityMap;

