import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App({wd, ht, isPathFinder = false}) {
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const ownLocationRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [connectionError, setConnectionError] = useState(null)


  const socket = useMemo(() => {
    // Connect to backend server
    const backendUrl = import.meta.env.VITE_API_URL
    console.log('🔌 Connecting to backend at:', backendUrl)
    
    return io(backendUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      forceNew: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false,
      extraHeaders: {
        'Access-Control-Allow-Origin': '*'
      }
    })
  }, [])

  useEffect(() => {
    // Ensure default Leaflet marker icons load correctly
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    })
    L.Marker.prototype.options.icon = defaultIcon

    if (!mapRef.current) {
      mapRef.current = L.map('map', { zoomControl: true }).setView([0, 0], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '', // Remove attribution
      }).addTo(mapRef.current)
    }

    const map = mapRef.current
    const markers = markersRef.current

    // Socket event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setConnectionStatus('connected')
      setConnectionError(null)
    })
    
    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err)
      console.error('Error message:', err.message)
      console.error('Error description:', err.description)
      console.error('Backend URL:', import.meta.env.VITE_API_URL)
      setConnectionStatus('error')
      setConnectionError(err.message)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnectionStatus('disconnected')
    })
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts')
      setConnectionStatus('connected')
      setConnectionError(null)
    })

    socket.on('receive-location', (data) => {
      console.log('Location received:', data)
      const { id, latitude, longitude } = data
      
      if (markers[id]) {
        markers[id].setLatLng([latitude, longitude])
      } else {
        // Create new marker for this user
        const marker = L.marker([latitude, longitude]).addTo(map)
        marker.bindPopup(`User ${id.slice(0, 8)}`).openPopup()
        markers[id] = marker
      }
    })

    socket.on('user-disconnected', (id) => {
      if (markers[id]) {
        map.removeLayer(markers[id])
        delete markers[id]
      }
    })

    // Get user's current location
    if (navigator.geolocation?.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          ownLocationRef.current = { lat: latitude, lng: longitude }
          
          // Center map on user's location
          map.setView([latitude, longitude], 16)
          
          // Add user's own marker
          const ownMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: 'own-location-marker',
              html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map)
          ownMarker.bindPopup('Your Location').openPopup()
          
          // Send location to backend
          socket.emit('send-location', { latitude, longitude })
        },
        (error) => {
          console.error('Error getting initial position:', error)
          setConnectionError('Unable to get your location')
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      )
    }

    // Watch for location changes
    const watchId = navigator.geolocation?.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        ownLocationRef.current = { lat: latitude, lng: longitude }
        
        // Update own marker position
        if (markers[socket.id]) {
          markers[socket.id].setLatLng([latitude, longitude])
        }
        
        // Send updated location to backend
        socket.emit('send-location', { latitude, longitude })
      },
      (error) => {
        console.error('Error watching position:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )

    return () => {
      if (watchId && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId)
      }
      socket.off('connect')
      socket.off('connect_error')
      socket.off('receive-location')
      socket.off('user-disconnected')
      socket.disconnect()
      if (map) {
        map.remove()
        mapRef.current = null
      }
    }
  }, [socket])

  return (
    <div className='relative'>
      {/* PathFinder Mode Indicator - Top Right */}
      {isPathFinder && (
        <div className='absolute top-2 right-1 z-[1000] px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg border border-blue-400'>
          🗺️ PathFinder Mode
        </div>
      )}

      {/* Connection Status Indicator - Bottom Left */}
      <div className='absolute bottom-4 left-4 z-[1000] px-4 py-3 rounded-full text-sm font-semibold text-white shadow-xl border-2 backdrop-blur-sm' 
           style={{
             backgroundColor: connectionStatus === 'connected' ? 'rgba(76, 175, 80, 0.9)' : 
                            connectionStatus === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                            connectionStatus === 'disconnected' ? 'rgba(255, 152, 0, 0.9)' : 'rgba(33, 150, 243, 0.9)',
             borderColor: connectionStatus === 'connected' ? '#4CAF50' : 
                         connectionStatus === 'error' ? '#f44336' : 
                         connectionStatus === 'disconnected' ? '#ff9800' : '#2196F3'
           }}>
        <div className='flex items-center gap-2'>
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-300' : 
            connectionStatus === 'error' ? 'bg-red-300' : 
            connectionStatus === 'disconnected' ? 'bg-orange-300' : 'bg-blue-300'
          }`}></div>
          <span className='font-medium'>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
            {connectionStatus === 'error' && 'Connection Error'}
          </span>
        </div>
      </div>
      
      {/* Connection Error - Below Status Button */}
      {connectionError && (
        <div className='absolute bottom-20 left-4 z-[1000] px-4 py-2 rounded-lg text-xs text-white bg-red-500 max-w-[300px] shadow-lg border border-red-400'>
          <div className='flex items-center gap-2'>
            <span>⚠️</span>
            <span>Error: {connectionError}</span>
          </div>
        </div>
      )}

      <div id="map" style={{ width: wd, height: ht, zIndex: 10 }} />
    </div>
  )
}

export default App
