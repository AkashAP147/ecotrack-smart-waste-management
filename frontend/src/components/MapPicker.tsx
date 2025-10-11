import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Create custom icon
const defaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number } | null;
  height?: string;
}

interface LocationMarkerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number } | null;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ 
  onLocationSelect, 
  initialLocation 
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      onLocationSelect(lat, lng);
    },
  });

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
      map.setView([initialLocation.lat, initialLocation.lng], map.getZoom());
    } else {
      // Try to get user's current location
      map.locate();
    }
  }, [map, initialLocation]);

  useMapEvents({
    locationfound(e) {
      if (!position) {
        const { lat, lng } = e.latlng;
        setPosition({ lat, lng });
        onLocationSelect(lat, lng);
        map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  return position ? (
    <Marker position={[position.lat, position.lng]} icon={defaultIcon} />
  ) : null;
};

const MapPicker: React.FC<MapPickerProps> = ({ 
  onLocationSelect, 
  initialLocation,
  height = '400px'
}) => {
  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.0060];
  
  const center: [number, number] = initialLocation 
    ? [initialLocation.lat, initialLocation.lng]
    : defaultCenter;

  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker 
          onLocationSelect={onLocationSelect}
          initialLocation={initialLocation}
        />
      </MapContainer>
      
      <div className="mt-2 text-sm text-gray-600 text-center">
        Click on the map to select a location
      </div>
    </div>
  );
};

export default MapPicker;
