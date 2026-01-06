import React, { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "./ContextTheme";
import RealTimeClock from "./RealTimeClock";
import useUserDistances from "../../hooks/useUserDistances";
import { FaMapMarkedAlt, FaSatelliteDish, FaUsers, FaChartLine } from "react-icons/fa";
import gsap from "gsap";

const HomeClean = () => {
  const { isDark } = useContext(ThemeContext);
  const { totalUsers, hasConnections } = useUserDistances();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = containerRef.current;
    if (!ctx) return;
    const cards = ctx.querySelectorAll(".dashboard-card");
    gsap.from(cards, { y: 24, opacity: 0, duration: 0.7, stagger: 0.08 });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen w-full p-6 transition-colors duration-500 ${
        isDark ? "bg-[#0B0C15] text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-gray-700/30 pb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-2">
            Control Center
          </h1>
          <p className="text-sm text-gray-400 font-mono">SYSTEM STATUS: ONLINE</p>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <RealTimeClock />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="dashboard-card p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <FaUsers size={20} />
            <span className="font-bold tracking-wider text-xs uppercase">Network</span>
          </div>
          <div className="text-4xl font-bold mb-1">{totalUsers}</div>
          <p className="text-xs text-gray-400">Active Nodes Connected</p>
        </div>

        <div className="dashboard-card p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4 text-green-400">
            <FaSatelliteDish size={20} />
            <span className="font-bold tracking-wider text-xs uppercase">Signal</span>
          </div>
          <div className="text-2xl font-bold mb-1">{hasConnections ? "Stable Link" : "Searching..."}</div>
          <p className="text-xs text-gray-400">Uplink Status</p>
        </div>

        <div className="dashboard-card p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4 text-purple-400">
            <FaChartLine size={20} />
            <span className="font-bold tracking-wider text-xs uppercase">Velocity</span>
          </div>
          <div className="text-4xl font-bold mb-1">0 km/h</div>
          <p className="text-xs text-gray-400">Current Average Speed</p>
        </div>
      </div>

      <div className="dashboard-card bg-gray-900/80 rounded-2xl p-8 border border-gray-700/50 text-center relative overflow-hidden">
        <h2 className="text-2xl font-bold mb-4">Ready to Initiate Tracking?</h2>
        <p className="text-gray-400 mb-6 max-w-xl mx-auto">Open PathFinder to view real-time location data and route planning.</p>
        <button
          onClick={() => navigate("/pathfinder")}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl"
        >
          <FaMapMarkedAlt />
          <span className="ml-3">Launch PathFinder</span>
        </button>
      </div>
    </div>
  );
};

export default HomeClean;
