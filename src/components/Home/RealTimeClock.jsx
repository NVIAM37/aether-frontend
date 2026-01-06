import React, { useState, useEffect } from 'react';

const RealTimeClock = ({ useBackend = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backendData, setBackendData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (useBackend) {
      fetchBackendTime();
      const backendTimer = setInterval(fetchBackendTime, 5000); // Update every 5 seconds
      return () => clearInterval(backendTimer);
    }
  }, [useBackend]);

  const fetchBackendTime = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3000/api/current-time');
      const data = await response.json();
      setBackendData(data);
    } catch (error) {
      console.log('Backend not available, using local time');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    const displayHours = hours % 12 || 12;
    
    // Add leading zeros for single digits
    const displayMinutes = minutes.toString().padStart(2, '0');
    const displaySeconds = seconds.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`;
  };

  const getGreeting = (hours) => {
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    if (hours < 21) return 'Good Evening';
    return 'Good Night';
  };

  const displayGreeting = backendData?.greeting || getGreeting(currentTime.getHours());
  const displayTime = formatTime(currentTime);
  const displayDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="text-center lg:border-2 border  border-blue-200 py-2 lg:h-[180px] w-full lg:w-[220px]   ">
      <div className="text-2xl font-semibold text-gray-600 mb-2">
        {displayGreeting}
      </div>
      <div className=" text-[1.2rem] transition-all duration-500 ease-in-out   lg:text-4xl font-bold text-[#3554af] mb-2">
        {displayTime}
      </div>
      <div className="text-sm text-gray-500 mb-2">
        {displayDate}
      </div>
      {useBackend && backendData && (
        <div className="text-xs text-gray-400">
          <div>Timezone: {backendData.timezone}</div>
          <div>Server: {isLoading ? 'Syncing...' : 'Connected'}</div>
        </div>
      )}
    </div>
  );
};

export default RealTimeClock;
