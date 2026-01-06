import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import io from "socket.io-client"; // Import Socket.io
import { offlineBuffer } from "../../services/OfflineBuffer";
import { alertEngine } from "../../services/AlertEngine";
import { FaLocationArrow, FaSearch, FaBroadcastTower, FaUserAstronaut, FaRoute, FaMapMarkerAlt, FaRobot, FaMobileAlt, FaQrcode, FaSatelliteDish, FaExpand, FaCompress, FaChevronUp, FaChevronDown, FaExclamationTriangle, FaWifi, FaTachometerAlt, FaSignal, FaBan } from "react-icons/fa";
import { GiRadarSweep } from "react-icons/gi";
import { useSearchParams } from "react-router-dom";
import "./PathFinder.css";

// --- CONFIGURATION ---
// --- CONFIGURATION ---
// Dynamic Backend URL for Mobile/PC compatibility
const hostname = window.location.hostname;
const BACKEND_URL = `http://${hostname}:5000`;

// --- CUSTOM ICONS ---
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = createIcon("blue");
const destIcon = createIcon("red");
const agentIcon = createIcon("green"); // Nearby Agents
const trackingIcon = createIcon("gold"); // The one you are actively tracking

// --- HELPER: FLY TO LOCATION ---
const FlyToLocation = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 15, { duration: 2 });
    }
  }, [coords, map]);
  return null;
};

// --- ROUTING MACHINE COMPONENT ---
const RoutingMachine = ({ start, end, setRouteInfo, color }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    const control = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      // Use OSRM public router
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      lineOptions: {
        styles: [
          { color: 'black', opacity: 0.15, weight: 9 }, // Shadow
          { color: 'white', opacity: 0.8, weight: 6 },  // Outline
          { color: color, opacity: 1, weight: 4 }       // Main Path
        ]
      },
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      containerClassName: 'hidden',
    });

    control.on("routesfound", function (e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      const instructions = routes[0].instructions;

      setRouteInfo({
        distance: (summary.totalDistance / 1000).toFixed(2) + " km",
        time: (summary.totalTime / 60).toFixed(0) + " min",
        nextStep: instructions.length > 0 ? instructions[0].text : "Arrived",
        steps: instructions
      });
    });

    control.addTo(map);
    routingControlRef.current = control;

    return () => {
      if (map && routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, start, end, color]);

  return null;
};

// --- CLICK HANDLER ---
const MapClickHandler = ({ setDest, stopTracking }) => {
  useMapEvents({
    click(e) {
      stopTracking(); // Stop tracking agents if user clicks manually
      setDest([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// --- MAIN COMPONENT ---
const Pathfinder = () => {
  // --- NEW LOGIC: DETECT ROOM (Task 1 & 2) ---
  const [searchParams] = useSearchParams();
  const isAgentMode = searchParams.get("mode") === "agent";
  const roomID = searchParams.get("room"); // Changed from session to room
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    // Generate link structure but wait for socket/room to populate ID
    const hostname = window.location.hostname;
    const port = window.location.port;
    if (roomID) {
        setShareLink(`http://${hostname}:${port}/pathfinder?room=${roomID}`);
    }
  }, [roomID]);

  // State
  const [socket, setSocket] = useState(null);
  const [userPos, setUserPos] = useState([20, 0]); // Neutral Global Default
  const [destPos, setDestPos] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  // NEW STATE: INTELLIGENCE LAYER
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [connectionQuality, setConnectionQuality] = useState("live"); // live, weak, offline
  const [gpsAccuracy, setGpsAccuracy] = useState("high"); // high, medium, low
  const [speedTrend, setSpeedTrend] = useState("stable"); // stable, accel, decel
  const lastSpeedRef = useRef(0);
  const [activeRoom, setActiveRoom] = useState(roomID || null); // Track active activeRoom
  const [isSessionActive, setSessionActive] = useState(false); // Task 1: Room-level tracking state
  
  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRouteInfoExpanded, setIsRouteInfoExpanded] = useState(false);

  // Real-Time Data
  const [nearbyAgents, setNearbyAgents] = useState({}); // { socketId: { lat, lng, name } }
  const [trackingId, setTrackingId] = useState(null); // ID of agent we are tracking
  const trackingIdRef = useRef(null); // Ref for stale closures

  // Sync ref
  useEffect(() => {
    trackingIdRef.current = trackingId;
    // Task 1: Emit Track Start when we start tracking someone
    if (trackingId && socket) {
        socket.emit("start-tracking", { room: activeRoom || roomID });
        setSessionActive(true); // We are the host/tracker, so session is active
    }
  }, [trackingId, activeRoom, roomID, socket]);

  // Ref to hold the latest activeRoom for the geolocation closure
  const activeRoomRef = useRef(activeRoom);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // MONITOR CONNECTION QUALITY
  useEffect(() => {
    const interval = setInterval(() => {
        if (!socket || !socket.connected) {
            setConnectionQuality("offline");
        } else {
            // Simple latency check could go here, for now assume connected = live
            // If buffer has items, we are "recovering"
            if (offlineBuffer.getCount() > 0) {
                 setConnectionQuality("recovering");
            } else {
                 setConnectionQuality("live");
            }
        }
    }, 2000);
    return () => clearInterval(interval);
  }, [socket]);

  // --- 1. INITIALIZE SOCKET & GEOLOCATION ---
  useEffect(() => {
    // Connect to Backend
    const newSocket = io(BACKEND_URL); 
    setSocket(newSocket);
    
    // Track watcher ID for cleanup
    let geoWatchId = null;

    newSocket.on("connect", () => {
        console.log("Connected - Flushing Buffer...", newSocket.id);
        offlineBuffer.flush(newSocket);
        
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : ""; 
        let targetRoom = roomID;
        
        if (!targetRoom) {
            targetRoom = newSocket.id; 
            setShareLink(`http://${hostname}${port}/pathfinder?room=${targetRoom}`);
            console.log("Host created Room:", targetRoom);
            activeRoomRef.current = targetRoom;
        } else {
             console.log("Guest joining Room:", targetRoom);
             setShareLink(`http://${hostname}${port}/pathfinder?room=${targetRoom}`);
        }
        
        setActiveRoom(targetRoom);
        newSocket.emit("join-room", targetRoom);
    });

    // Get Real Position
    if ("geolocation" in navigator) {
      geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy } = position.coords;
          const newPos = [latitude, longitude];
          setUserPos(newPos);

          // 1. Contextual Analysis
          if (accuracy < 20) setGpsAccuracy("high");
          else if (accuracy < 50) setGpsAccuracy("medium");
          else setGpsAccuracy("low");

          if (speed > lastSpeedRef.current + 0.5) setSpeedTrend("accel");
          else if (speed < lastSpeedRef.current - 0.5) setSpeedTrend("decel");
          else setSpeedTrend("stable");
          lastSpeedRef.current = speed || 0;

          // 2. Alert Engine
          const alerts = alertEngine.evaluate(
             {lat: latitude, lng: longitude, speed: speed || 0}, 
             routeInfo, 
             destPos
          );
          setActiveAlerts(alerts);

          // 3. Smart Transmission (Offline Buffer)
          const currentRoom = activeRoomRef.current || roomID;
          const payload = { lat: latitude, lng: longitude, speed: speed, timestamp: Date.now() };

          if (currentRoom) {
             if (newSocket && newSocket.connected) {
                 offlineBuffer.flush(newSocket);
                 newSocket.emit("update-location", payload);
                 newSocket.emit("agent-active", { 
                    ...payload,
                    name: isAgentMode ? "Mobile Agent" : "Web User",
                    velocity: speed,
                    room: currentRoom,
                    isTracking: !!trackingIdRef.current 
                 });
             } else {
                 offlineBuffer.add(payload);
                 setConnectionQuality("offline");
             }
          }
        },
        (error) => {
          console.error("Geolocation Error:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
      );
    }
    
    // Task 1: Listen for Global Track Start
    newSocket.on("track-started", () => {
        console.log("Session went LIVE via Track Start Event");
        setSessionActive(true);
    });

    // Socket Listeners
    newSocket.on("agent-update", (allAgents) => {
      // Filter out myself AND invalid agents
      const others = {};
      let anyRemoteTracking = false;

      Object.keys(allAgents).forEach(key => {
        const a = allAgents[key];
        if (a.isTracking) anyRemoteTracking = true; // Check if anyone is tracking

        if (key !== newSocket.id && typeof a.lat === 'number' && typeof a.lng === 'number') {
            others[key] = a;
        }
      });
      setNearbyAgents(others);
      
      // If someone else is tracking/broadcasting, session is active
      if (anyRemoteTracking) setSessionActive(true);

      if (trackingIdRef.current && !others[trackingIdRef.current]) {
        setTrackingId(null);
        alert("Target lost signal (Disconnected).");
      }
    });

    // CLEANUP FUNCTION
    return () => {
        console.log("Cleaning up Socket & Geolocation...");
        if (newSocket) newSocket.disconnect();
        if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
    };
  }, [roomID, isAgentMode]); // Re-run if room changes
  
  // Map Visibility Condition (Task 4)
  // Maps renders if: Session is Active (someone clicked track), Agent Mode, or local interactions.
  // REMOVED: roomID check. User B waits for 'track-started' or 'isSessionActive'.
  const isMapVisible = Boolean(isSessionActive || isAgentMode || trackingId || destPos || routeInfo);

  // --- 2. SYNC TRACKING ---
  // If we are tracking an ID, update destination automatically when they move
  useEffect(() => {
    if (trackingId && nearbyAgents[trackingId]) {
      const agent = nearbyAgents[trackingId];
      setDestPos([agent.lat, agent.lng]);
    }
  }, [nearbyAgents, trackingId]);


  // --- HANDLERS ---
  const handleSearch = async () => {
    if (!searchQuery) return;
    setTrackingId(null); // Stop tracking agents if manual search

    try {
      // Use Nominatim API for real address search
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setDestPos([lat, lon]);
      } else {
        alert("Location not found.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Calculate distance between two coords (Haversine formula simplified)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Distance in km
  };
  
    // Guard for MapContainer center
    const safeUserPos = (Array.isArray(userPos) && userPos.length === 2 && typeof userPos[0] === 'number' && typeof userPos[1] === 'number') 
        ? userPos 
        : [20, 0];


  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-hex-grid text-white overflow-hidden relative font-sans">

      {/* LEFT CONTROL PANEL (GLASSMORPHIC) */}
      {!isFullscreen && (
      <div
        className={`${
          isMinimized 
            ? 'h-[60px] md:h-full md:w-[80px]' 
            : 'h-[45vh] md:h-full md:w-[400px]'
        } w-full z-20 flex flex-col p-4 md:p-6 glass-panel relative left-0 top-0 border-b md:border-b-0 md:border-r border-cyan-500/30 transition-all duration-500 ease-in-out shrink-0`}
      >

        {/* Toggle Button */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className={`absolute z-50 w-8 h-8 rounded-full bg-cyan-900 border border-cyan-500 text-cyan-400 flex items-center justify-center hover:bg-cyan-800 transition-colors shadow-[0_0_10px_rgba(0,243,255,0.3)]
            top-3 right-4 md:top-4 md:right-[-15px]
          `}
        >
          <FaLocationArrow className={`transform transition-transform duration-500 ${isMinimized ? 'rotate-90 md:rotate-135' : '-rotate-90 md:-rotate-45'}`} />
        </button>

        {/* Header */}
        <div className={`mb-4 md:mb-8 flex items-center gap-3 transition-opacity duration-300 ${isMinimized ? 'opacity-100 md:opacity-0' : 'opacity-100'}`}>
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.5)] ${isMinimized ? 'scale-75 md:scale-100' : ''}`}>
             {/* Icon hides on minimized desktop, shows on mobile header */}
            <FaLocationArrow className="text-cyan-400 transform -rotate-45 text-sm md:text-base" />
          </div>
          <div className={`${isMinimized ? 'block md:hidden' : 'block'}`}>
            <h1 className="text-lg md:text-2xl font-bold neon-text-blue tracking-wider">AETHER</h1>
            <span className="text-[10px] md:text-xs text-cyan-200 tracking-[0.2em] opacity-80 block">PATHFINDER MODULE</span>
          </div>
        </div>

        {/* Minimized Icon View (Desktop Only) */}
        {isMinimized && (
          <div className="hidden md:flex flex-col items-center gap-6 mt-12 animate-fade-in text-cyan-500/50">
            <FaSearch className="text-xl hover:text-cyan-400 cursor-pointer" title="Search" onClick={() => setIsMinimized(false)} />
            <GiRadarSweep className="text-xl hover:text-cyan-400 cursor-pointer animate-spin-slow" title="Tracking" onClick={() => setIsMinimized(false)} />
          </div>
        )}

        {/* Maximized Content */}
        <div className={`flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar transition-all duration-300 ${isMinimized ? 'opacity-0 pointer-events-none translate-x-[-20px]' : 'opacity-100 translate-x-0'}`}>

          {/* Section: Manual Pathfinding */}
          <div className="border border-cyan-500/20 bg-black/20 p-3 md:p-4 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

            <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
              <FaMapMarkerAlt /> MANUAL PATHFINDING
            </h3>

            <div className="relative mb-3 space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter destination..."
                className="w-full pl-4 pr-10 py-3 rounded-lg sci-fi-input text-gray-200 focus:outline-none"
              />
              <FaSearch className="absolute right-3 top-3 text-cyan-500/50 cursor-pointer hover:text-white" onClick={handleSearch} />
            </div>

            <button
              onClick={handleSearch}
              className="w-full py-3 rounded-lg sci-fi-button text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-transform transform active:scale-95"
            >
              FIND PATH
            </button>
          </div>

          {/* Section: Nearby Entities */}
          <div className="border border-cyan-500/20 bg-black/20 p-3 md:p-4 rounded-xl relative">
            <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
              <GiRadarSweep className="animate-spin-slow" /> NEARBY ENTITIES
            </h3>

            {/* --- NEW: CONNECT DEVICE SECTION --- */}
            <div className="mb-4 bg-[#0B0C15] border border-blue-500/30 p-3 md:p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                <FaQrcode className="text-green-400" />
                <label className="text-xs text-white font-bold uppercase tracking-wider">Add New Agent</label>
              </div>

              <div className="flex gap-3 items-center">
                {/* Auto-Generated QR Code */}
                <div className="bg-white p-1 rounded shrink-0 h-[60px] w-[60px] md:h-[70px] md:w-[70px]">
                 {shareLink ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareLink)}`}
                    alt="Scan QR"
                    className="w-full h-full"
                  />
                  ) : <div className="w-full h-full bg-gray-200 animate-pulse"/>}
                </div>

                <div className="flex flex-col justify-between w-full gap-2">
                  <p className="text-[10px] text-gray-400 leading-tight hidden md:block">
                    Scan with mobile to transmit GPS data.
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight block md:hidden">
                    Scan or Copy Link
                  </p>
                  <button
                    onClick={() => {
                      if (shareLink) {
                         navigator.clipboard.writeText(shareLink);
                         alert("Link copied!");
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-[11px] py-2 md:py-1.5 rounded font-bold transition-all w-full uppercase active:scale-95 shadow-md"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Render Real Nearby Agents */}
              {Object.keys(nearbyAgents).length === 0 ? (
                <div className="text-cyan-500/50 text-xs italic text-center py-2">No active signals in range.</div>
              ) : (
                Object.keys(nearbyAgents).map((key) => {
                  const agent = nearbyAgents[key];
                  const dist = getDistance(userPos[0], userPos[1], agent.lat, agent.lng);
                  const isTracking = trackingId === key;

                  return (
                    <div key={key} className={`flex items-center justify-between p-2 rounded border transition-all ${isTracking ? 'bg-green-900/40 border-green-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-cyan-900/10 border-cyan-500/10'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isTracking ? 'bg-green-600/20 border-green-400' : 'bg-blue-600/20 border-blue-400'}`}>
                          <FaUserAstronaut className={`${isTracking ? 'text-green-300' : 'text-blue-300'} text-xs`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isTracking ? 'text-green-200' : 'text-blue-200'}`}>{agent.name}</span>
                          <span className="text-[10px] text-blue-400/60">{dist}km • Mobile</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setTrackingId(isTracking ? null : key)}
                        className={`px-3 py-2 md:py-1 text-[10px] rounded hover:bg-opacity-20 transition-all active:scale-95 ${isTracking ? 'bg-green-500 text-black font-bold animate-pulse' : 'bg-blue-500/10 border border-blue-500/40 text-blue-400'}`}
                      >
                        {isTracking ? 'TRACKING' : 'TRACK'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* REMOVED BROADCAST TRANSMISSION UI (Task 4) */}

        </div>

        {/* Footer */}
        <div className={`mt-4 text-[10px] text-cyan-500/30 text-center font-mono ${isMinimized ? 'opacity-0' : 'opacity-100'} hidden md:block`}>
          SYS.VER.4.0.2 // AETHER NET
        </div>
      </div>
      )}


      {/* RIGHT MAP VIEW */}
      <div className="flex-1 relative h-full bg-black">

        {/* Top Overlay Gradient */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

         {/* SMART OVERLAY LAYER (HUD) - Top Center */}
         <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-2 pointer-events-none">
            
            {/* Connection Status */}
            <div className={`glass-panel px-3 py-1 rounded-full flex items-center gap-2 border ${connectionQuality === 'offline' ? 'border-red-500 bg-red-900/50' : connectionQuality === 'recovering' ? 'border-yellow-500' : 'border-green-500/30'}`}>
                {connectionQuality === 'offline' ? <FaBan className="text-red-400 text-xs"/> : <FaWifi className="text-green-400 text-xs"/>}
                <span className="text-[10px] font-mono uppercase font-bold text-white">
                    {connectionQuality === 'offline' ? `OFFLINE (${offlineBuffer.getCount()})` : connectionQuality === 'recovering' ? 'SYNCING...' : 'LIVE'}
                </span>
            </div>

            {/* GPS Confidence */}
            <div className={`glass-panel px-3 py-1 rounded-full flex items-center gap-2 border hidden md:flex ${gpsAccuracy === 'high' ? 'border-cyan-500/30' : 'border-yellow-500/50'}`}>
                <FaSatelliteDish className={`${gpsAccuracy === 'high' ? 'text-cyan-400' : 'text-yellow-400'} text-xs`} />
                <span className="text-[10px] font-mono uppercase font-bold text-gray-300">
                    GPS: {gpsAccuracy}
                </span>
            </div>

             {/* Speed Trend */}
             <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2 border border-cyan-500/30 hidden md:flex">
                <FaTachometerAlt className="text-cyan-400 text-xs" />
                <span className="text-[10px] font-mono uppercase font-bold text-gray-300">
                    {speedTrend === 'accel' ? 'ACCEL' : speedTrend === 'decel' ? 'DECEL' : 'STABLE'}
                </span>
            </div>
         </div>

         {/* ALERT NOTIFICATIONS - Top Left Stack */}
         <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
            {activeAlerts.map((alert, idx) => (
                <div key={idx} className={`glass-panel p-3 rounded-lg border-l-4 animate-slide-right flex items-center gap-3 ${alert.level === 'danger' ? 'border-red-500 bg-red-900/20' : 'border-yellow-400 bg-yellow-900/20'}`}>
                    <FaExclamationTriangle className={`${alert.level === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
                    <div>
                        <div className="text-xs font-bold text-white uppercase">{alert.id.replace('_', ' ')}</div>
                        <div className="text-[10px] text-gray-300">{alert.message}</div>
                    </div>
                </div>
            ))}
         </div>
        
        {/* Fullscreen Toggle (Top Right) */}
        <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-4 right-4 z-[1001] w-10 h-10 bg-black/50 backdrop-blur-md border border-cyan-500/30 text-cyan-400 rounded-lg flex items-center justify-center hover:bg-cyan-900/50 transition-all shadow-lg active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
        >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>

        {!isMapVisible ? (
             // --- TASK 5: DEFAULT MAP PLACEHOLDER ---
             <div className="w-full h-full flex items-center justify-center bg-[#050510] text-cyan-500/30 font-mono tracking-widest relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="z-10 flex flex-col items-center animate-pulse">
                     <FaLocationArrow className="text-6xl mb-6 opacity-20" />
                     <p>INITIATE TRACKING TO VIEW MAP</p>
                </div>
             </div>
        ) : (
          <MapContainer
            center={safeUserPos}
            zoom={14}
            zoomControl={false}
            className="h-full w-full outline-none z-0"
          >
            <TileLayer
              attribution='&copy; '
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <MapClickHandler setDest={setDestPos} stopTracking={() => setTrackingId(null)} />
            <FlyToLocation coords={destPos} />

            {/* User Marker */}
            <Marker position={safeUserPos} icon={userIcon}>
              <Popup className="glass-popup">Identify: YOU</Popup>
            </Marker>

            {/* Destination / Agent Markers */}
            {destPos && (
              <Marker position={destPos} icon={trackingId ? agentIcon : destIcon}>
                <Popup>{trackingId ? "Target Entity" : "Destination"}</Popup>
              </Marker>
            )}

            {/* Real Agents on Map - Already Filtered */}
            {Object.keys(nearbyAgents).map((key) => {
              const agent = nearbyAgents[key];
              // Double safety check
              if (typeof agent.lat !== 'number' || typeof agent.lng !== 'number') return null;
              
              const isTarget = trackingId === key;
              return (
                <Marker
                  key={key}
                  position={[agent.lat, agent.lng]}
                  icon={isTarget ? trackingIcon : agentIcon}
                  opacity={isTarget ? 1 : 0.6}
                >
                  <Popup>{agent.name} <br /> {isTarget ? "(LOCKED)" : ""}</Popup>
                </Marker>
              );
            })}

            {/* Routing Machine */}
            {destPos && (
              <RoutingMachine
                start={userPos} // Note: This uses userPos, assume safeUserPos logic was inside map but RoutingMachine uses raw or safe? RoutingMachine inside MapContainer should verify props but for now I'll just restore it.
                 // Actually, RoutingMachine uses useMap() so it must be inside MapContainer.
                end={destPos}
                setRouteInfo={setRouteInfo}
                color={trackingId ? "#10B981" : "#EF4444"} 
              />
            )}
           
          </MapContainer>
        )}

        {/* FLOATING ROUTE INFO BOX - COLLAPSIBLE */}
        {routeInfo && (
          <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-end">
            
            {/* Toggle Button (Always Visible when collapsed, or part of header when expanded? User said "if i click... card open, otherwise button showing") */}
            {!isRouteInfoExpanded ? (
                 <button 
                    onClick={() => setIsRouteInfoExpanded(true)}
                    className="glass-panel px-4 py-3 rounded-xl border border-cyan-400/30 text-cyan-400 flex items-center gap-2 shadow-lg animate-fade-in hover:bg-cyan-900/30 active:scale-95 transition-all"
                 >
                    <FaRoute /> 
                    <span className="text-xs font-bold font-mono">NAV DATA</span> 
                    <FaChevronUp className="text-[10px]" />
                 </button>
            ) : (
                <div className="bg-slate-950 p-5 rounded-xl w-80 border-2 border-cyan-500/50 shadow-2xl shadow-black relative animate-slide-up">
                    {/* Header with Close */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/30 cursor-pointer group" onClick={() => setIsRouteInfoExpanded(false)}>
                        <div className="flex items-center gap-3">
                            <div className="bg-cyan-900/40 p-2 rounded-lg text-cyan-400">
                                <FaRoute className="text-lg" />
                            </div>
                            <div>
                                <h4 className="text-white font-extrabold text-sm tracking-wider">{trackingId ? "PURSUIT ACTIVE" : "ROUTE GUIDANCE"}</h4>
                                <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">{trackingId ? "LIVE TRACKING" : "NAVIGATION"}</span>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-1 rounded-md group-hover:bg-slate-700 transition-colors">
                            <FaChevronDown className="text-cyan-400" />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Target Section */}
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-cyan-500 font-bold uppercase tracking-wider">Target Destination</span>
                                <span className={`w-2 h-2 rounded-full ${trackingId ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'}`}></span>
                            </div>
                            <div className="text-white font-mono font-bold truncate text-sm">
                                {trackingId ? "Signal Locked" : "Designated Coordinates"}
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Distance</span>
                                <span className="text-2xl text-white font-black font-mono tracking-tighter block">{routeInfo.distance.split(' ')[0]}<span className="text-sm text-cyan-500 ml-1">{routeInfo.distance.split(' ')[1]}</span></span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Est. Time</span>
                                <span className="text-2xl text-white font-black font-mono tracking-tighter block">{routeInfo.time.split(' ')[0]}<span className="text-sm text-cyan-500 ml-1">{routeInfo.time.split(' ')[1]}</span></span>
                            </div>
                        </div>

                        {/* Turn-by-Turn */}
                        <div className="mt-2 text-center">
                            <div className="text-[10px] text-cyan-500/80 uppercase font-bold tracking-widest mb-2">Next Maneuver</div>
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mx-auto inline-block w-full">
                                <div className="text-sm text-white font-medium flex items-center justify-center gap-2">
                                    <FaLocationArrow className="text-cyan-400 text-xs" />
                                    {routeInfo.nextStep}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pathfinder;
