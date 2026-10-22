import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import StationMarker from './StationMarker';

const WORLD_CENTER = [20, 10];

// Component to dynamically fit map view to station markers
function MapBoundsUpdater({ stations = [], center, zoom, selectedStationId }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (center && zoom) {
      map.setView(center, zoom);
      return;
    }

    if (selectedStationId) {
      const selected = stations.find((s) => s.stationId === selectedStationId);
      if (selected && typeof selected.latitude === 'number' && typeof selected.longitude === 'number') {
        map.setView([selected.latitude, selected.longitude], 12);
        return;
      }
    }

    const validCoords = stations
      .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map((s) => [s.latitude, s.longitude]);

    if (validCoords.length === 1) {
      map.setView(validCoords[0], 11);
    } else if (validCoords.length > 1) {
      map.fitBounds(validCoords, { padding: [30, 30], maxZoom: 12 });
    }
  }, [map, stations, center, zoom, selectedStationId]);

  return null;
}

export default function AQIMap({
  stations = [],
  readings = {},
  selectedStationId,
  onSelectStation,
  center,
  zoom,
}) {
  const defaultCenter = center || WORLD_CENTER;
  const defaultZoom = zoom || 2;

  // When thousands of stations are passed in, limit rendering to stations with real AQI data (up to 400)
  // to maintain 60 FPS hardware-accelerated map rendering without main-thread jank
  const mapStations = useMemo(() => {
    if (stations.length <= 400) return stations;
    const withData = stations.filter(
      (s) => readings[s.stationId]?.aqi !== null && readings[s.stationId]?.aqi !== undefined
    );
    const list = withData.length > 0 ? withData.slice(0, 400) : stations.slice(0, 400);
    if (selectedStationId && !list.some((s) => s.stationId === selectedStationId)) {
      const sel = stations.find((s) => s.stationId === selectedStationId);
      if (sel) list.push(sel);
    }
    return list;
  }, [stations, readings, selectedStationId]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div className="leaflet-map-container">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Standard OpenStreetMap Tile Layer with full attribution */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapBoundsUpdater
            stations={mapStations}
            center={center}
            zoom={zoom}
            selectedStationId={selectedStationId}
          />

          {mapStations.map((station) => (
            <StationMarker
              key={station.stationId}
              station={station}
              latest={readings[station.stationId]}
              isSelected={selectedStationId === station.stationId}
              onSelect={onSelectStation}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
