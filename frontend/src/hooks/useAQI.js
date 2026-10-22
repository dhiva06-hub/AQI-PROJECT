import { useEffect, useRef, useState, useCallback } from 'react';
import { api, getSocket, AirQualityAPI } from '../services/api';

const POLL_INTERVAL_MS = 60 * 1000;
const STALE_THRESHOLD_MS = 90 * 1000; // no live event/heartbeat in this window => DELAYED

/**
 * Subscribes to live "aqiUpdated" events over Socket.IO and merges them into
 * a map of stationId -> latest reading. Falls back to REST polling every 60s
 * if the socket is disconnected, so the dashboard never goes fully stale.
 */
export function useAQI() {
  const [readings, setReadings] = useState({}); // stationId -> { station, latest }
  const [stationsMeta, setStationsMeta] = useState({}); // stationId -> station doc
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting|live|delayed
  const lastEventAtRef = useRef(Date.now());
  const pollRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await AirQualityAPI.getCurrentAll();
      const map = {};
      const meta = {};
      for (const entry of res.data) {
        map[entry.station.stationId] = entry.latest;
        meta[entry.station.stationId] = entry.station;
      }
      setReadings(map);
      setStationsMeta(meta);
      setError(null);
      lastEventAtRef.current = Date.now();
    } catch (err) {
      const base = api.defaults.baseURL;
      if (err.code === 'ECONNABORTED') {
        setError(`Request to API at ${base} timed out. Check that the backend is running and that your network connection to MongoDB Atlas is stable.`);
      } else if (err.message === 'Network Error') {
        setError(`Cannot reach the API at ${base}. Start the backend, and check VITE_API_BASE_URL in frontend/.env (restart the frontend after changing it).`);
      } else {
        setError(err.message || 'Failed to load air quality data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const socket = getSocket();

    const onConnect = () => setConnectionStatus('live');
    const onDisconnect = () => setConnectionStatus('delayed');
    const onUpdate = (measurement) => {
      lastEventAtRef.current = Date.now();
      setConnectionStatus('live');
      setReadings((prev) => ({ ...prev, [measurement.stationId]: measurement }));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('aqiUpdated', onUpdate);

    // Polling fallback: only actually re-fetches when the socket has been
    // quiet for longer than STALE_THRESHOLD_MS.
    pollRef.current = setInterval(() => {
      const quietFor = Date.now() - lastEventAtRef.current;
      if (quietFor > STALE_THRESHOLD_MS) {
        setConnectionStatus('delayed');
        fetchAll();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('aqiUpdated', onUpdate);
      clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  return { readings, stationsMeta, loading, error, connectionStatus, refetch: fetchAll };
}
