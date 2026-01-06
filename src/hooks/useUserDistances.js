import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useUserDistances = () => {
  const [distances, setDistances] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasConnections, setHasConnections] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use refs to prevent multiple socket connections and ensure cleanup
  const socketRef = useRef(null);
  const isInitializedRef = useRef(false);
  const hasInitialDataRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    
    isInitializedRef.current = true;
    
    console.log(`[Tab ${Date.now()}] Hook initializing - fetching data immediately...`);
    
    // Fetch initial distances immediately and aggressively
    fetchDistances();
    
    // Set up a safety timeout to ensure we don't get stuck loading forever
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.log(`[Tab ${Date.now()}] Safety timeout reached, stopping loading state`);
        setIsLoading(false);
        setError('Loading timeout - please refresh if needed');
      }
    }, 15000); // 15 seconds safety timeout
    
    // Set up aggressive periodic refresh until we get data
    const refreshInterval = setInterval(() => {
      if (!hasInitialDataRef.current && retryCountRef.current < 10) {
        retryCountRef.current++;
        console.log(`[Tab ${Date.now()}] Aggressive refresh attempt ${retryCountRef.current}/10 - fetching data...`);
        fetchDistances();
      } else if (retryCountRef.current >= 10) {
        console.log(`[Tab ${Date.now()}] Max retries reached, stopping aggressive refresh`);
        clearInterval(refreshInterval);
        // Even if we failed to get data, stop loading to show fallback UI
        setIsLoading(false);
      }
    }, 1000); // Check every 1 second aggressively
    
    // Connect to Socket.IO for real-time updates
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
      autoConnect: true,
      withCredentials: false,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log(`[Tab ${Date.now()}] Socket connected for distances:`, socket.id);
      setError(null);
      
      // Always fetch data after connection, regardless of previous attempts
      console.log(`[Tab ${Date.now()}] Socket connected, fetching data immediately...`);
      fetchDistances();
    });
    
    socket.on('connect_error', (err) => {
      console.error(`[Tab ${Date.now()}] Socket connection error for distances:`, err);
      setError('Connection failed');
      setIsLoading(false); // Stop loading on connection error
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`[Tab ${Date.now()}] Socket disconnected:`, reason);
    });
    
    socket.on('distances-updated', (data) => {
      console.log(`[Tab ${Date.now()}] Distances updated via socket:`, data);
      console.log('Real users connected:', data.totalUsers);
      console.log('Has connections:', data.hasConnections);
      console.log('Distances calculated:', data.distances?.length || 0);
      
      setDistances(data.distances || []);
      setTotalUsers(data.totalUsers || 0);
      setHasConnections(data.hasConnections || false);
      setIsLoading(false);
      setError(null);
      hasInitialDataRef.current = true;
      
      // Clear the aggressive refresh interval once we have data
      clearInterval(refreshInterval);
    });

    socket.on('welcome', (data) => {
      console.log(`[Tab ${Date.now()}] Welcome message received:`, data);
      console.log('Welcome - Total users:', data.totalUsers);
      console.log('Welcome - Has connections:', data.hasConnections);
      
      // Update state with welcome data
      setTotalUsers(data.totalUsers || 0);
      setHasConnections(data.hasConnections || false);
      setIsLoading(false);
      setError(null);
      hasInitialDataRef.current = true;
      
      // Clear the aggressive refresh interval once we have data
      clearInterval(refreshInterval);
      
      // If we have users but no distances yet, fetch distances
      if (data.totalUsers > 0 && data.hasConnections) {
        console.log(`[Tab ${Date.now()}] Welcome shows users exist, fetching distances...`);
        fetchDistances();
      }
    });

    // Cleanup on unmount
    return () => {
      console.log(`[Tab ${Date.now()}] Cleaning up socket connection`);
      clearInterval(refreshInterval);
      clearTimeout(safetyTimeout); // Clear safety timeout on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      isInitializedRef.current = false;
      hasInitialDataRef.current = false;
      retryCountRef.current = 0;
    };
  }, []);

  const fetchDistances = async () => {
    try {
      console.log(`[Tab ${Date.now()}] Fetching user distances from API...`);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user-distances`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[Tab ${Date.now()}] API response received:`, data);
      console.log('Real users:', data.totalUsers);
      console.log('Has connections:', data.hasConnections);
      console.log('Distances:', data.distances?.length || 0);
      
      setDistances(data.distances || []);
      setTotalUsers(data.totalUsers || 0);
      setHasConnections(data.hasConnections || false);
      setError(null);
      hasInitialDataRef.current = true;
      setIsLoading(false);
      
      console.log(`[Tab ${Date.now()}] Data successfully loaded, stopping aggressive refresh`);
    } catch (error) {
      console.error(`[Tab ${Date.now()}] Error fetching user distances:`, error);
      setError('Failed to fetch distances');
      // Set fallback values
      setDistances([]);
      setTotalUsers(0);
      setHasConnections(false);
      setIsLoading(false);
    }

  };

  // --- NEW: Real-time Agent Data for Homepage ---
  const [agents, setAgents] = useState({});
  const [latestActivity, setLatestActivity] = useState(null);
  const [maxVelocity, setMaxVelocity] = useState(0);

  useEffect(() => {
    if (!socketRef.current) return;
    
    const socket = socketRef.current;
    
    socket.on('agent-update', (updatedAgents) => {
        setAgents(updatedAgents);
        setLatestActivity({
            type: 'Location Update',
            time: 'Just Now',
            status: 'LIVE'
        });
        
        // Calculate max velocity among all agents
        let maxV = 0;
        Object.values(updatedAgents).forEach(agent => {
            if (agent.velocity && agent.velocity > maxV) {
                maxV = agent.velocity;
            }
        });
        setMaxVelocity(maxV);
    });

    return () => {
        socket.off('agent-update');
    };
  }, [socketRef.current]);

  const getDisplayDistance = () => {
    if (error) return 'Error';
    if (isLoading) return 'Loading...';
    if (!hasConnections || totalUsers === 0) return 'No users';
    if (totalUsers === 1) return 'Scanning...';
    if (distances.length === 0) return 'Calculating...';
    
    // Get the shortest distance between users
    const shortestDistance = Math.min(...distances.map(d => parseFloat(d.distance)));
    return `${shortestDistance} km`;
  };

  return {
    distances,
    totalUsers,
    hasConnections,
    isLoading,
    error,
    getDisplayDistance,
    refreshDistances: fetchDistances,
    agents,
    latestActivity,
    maxVelocity
  };
};

export default useUserDistances;
