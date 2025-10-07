// SimpleBaseMap.tsx - Basic map with just the base layer
import React, { useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SimpleBaseMap: React.FC = () => {
  useEffect(() => {
    console.log('SimpleBaseMap component mounted');
    console.log('Leaflet available:', typeof L !== 'undefined');
  }, []);

  return (
    <div style={{ height: '400px', width: '100%', position: 'relative', border: '1px solid #ccc' }}>
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
      </MapContainer>
    </div>
  );
};

export default SimpleBaseMap;
