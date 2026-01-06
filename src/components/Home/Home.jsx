import React, { useContext, useRef } from "react";
import { ThemeContext } from "./ContextTheme"; 
import { Link } from "react-router-dom";
import useUserDistances from "../../hooks/useUserDistances"; 
import { 
  FaRegCompass, 
  FaMapMarkerAlt, 
  FaWifi, 
  FaListUl, 
  FaChevronRight, 
  FaTachometerAlt 
} from "react-icons/fa";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";



const Home = () => {
  const { isDark } = useContext(ThemeContext);
  const { totalUsers = 0, latestActivity, maxVelocity, hasConnections } = useUserDistances() || {};
  
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  // --- Animations ---
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    tl.fromTo(".header-logo", 
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 }
    )
      .fromTo(".hero-text > *", 
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 
        "-=0.4"
      )
      .fromTo(".map-container-visual", 
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1 }, 
        "-=0.6"
      )
      .fromTo(".stats-card", 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, 
        "-=0.4"
      );
  }, { scope: containerRef });

  // --- 3D Hover Interaction ---
  const handleMouseMove = (e) => {
    if (!mapRef.current) return;
    const { left, top, width, height } = mapRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 60; 
    const y = (e.clientY - top - height / 2) / 60;
    mapRef.current.style.transform = `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg) scale(1.005)`;
  };

  const handleMouseLeave = () => {
    if (!mapRef.current) return;
    mapRef.current.style.transform = `perspective(1000px) rotateX(5deg) rotateY(-5deg) rotateZ(0deg) scale(1)`;
  };

  // Defining the new Tech/HUD Card Style
  const hudCardStyle = `
    relative overflow-hidden p-6 rounded-xl
    flex flex-col justify-between
    transition-all duration-300 ease-out
    border group
    hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20
    ${isDark 
      ? "bg-[#0A0B10]/90 border-gray-800 hover:border-blue-500/50" 
      : "bg-white border-gray-200 hover:border-blue-500/50 shadow-sm"
    }
  `;

  // Corner Accent Component
  const CornerAccent = () => (
    <>
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${isDark ? "border-blue-500" : "border-blue-600"} opacity-50`}></div>
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${isDark ? "border-blue-500" : "border-blue-600"} opacity-50`}></div>
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${isDark ? "border-blue-500" : "border-blue-600"} opacity-50`}></div>
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${isDark ? "border-blue-500" : "border-blue-600"} opacity-50`}></div>
    </>
  );

  return (
    <div ref={containerRef} className={`min-h-screen w-full relative overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white ${isDark ? "bg-[#050509] text-white" : "bg-gray-50 text-gray-900"}`}>

      {/* --- Dynamic Background --- */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-700/10 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-purple-700/10 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }}></div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="relative z-50 p-6 lg:p-8 header-logo flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <FaRegCompass className="text-xl text-white" />
        </div>
        <span className={`text-2xl font-bold tracking-widest ${isDark ? "text-white" : "text-gray-900"}`}>AETHER</span>
      </header>

      {/* --- Main Container --- */}
      <main className="relative z-40 px-6 lg:px-12 flex flex-col gap-16 pb-20 pt-4 max-w-[1600px] mx-auto">

        {/* --- SECTION 1: HERO --- */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
            
            {/* Left: Text (System Interface Style) */}
            <div className="hero-text col-span-1 lg:col-span-12 flex flex-col gap-8 items-center lg:items-start text-center lg:text-left z-50 pt-8">
                <div>
                    <h2 className="text-blue-500 font-medium text-sm tracking-[0.3em] uppercase mb-4 opacity-80 flex items-center gap-2 lg:justify-start justify-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        SYSTEM STATUS
                    </h2>
                    <h1 className={`text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Live Tracking.<br/>
                      <span className="font-semibold text-gray-500">Real Decisions.</span><br/>
                      <span className="font-medium text-gray-400">Zero Guesswork.</span>
                    </h1>
                    <p className={`text-xl md:text-2xl font-normal max-w-3xl leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      A real-time tracking system that syncs movement, detects anomalies, and keeps operations aware — <span className="text-blue-500">as they happen.</span>
                    </p>
                </div>

                {/* System Indicators */}
                <div className="w-full max-w-4xl border-t border-b border-gray-700/30 py-6 my-2">
                    <ul className={`flex flex-col md:flex-row gap-4 md:gap-12 justify-center lg:justify-start font-mono text-sm tracking-wider uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        <li className="flex items-center gap-2"><span className="text-blue-500">●</span> Tracking: <span className={isDark ? "text-white" : "text-gray-900"}>Active</span></li>
                        <li className="flex items-center gap-2"><span className="text-green-500">●</span> Sync: <span className={isDark ? "text-white" : "text-gray-900"}>Real-time</span></li>
                        <li className="flex items-center gap-2"><span className="text-purple-500">●</span> Accuracy: <span className={isDark ? "text-white" : "text-gray-900"}>High</span></li>
                        <li className="flex items-center gap-2"><span className="text-orange-500">●</span> Mode: <span className={isDark ? "text-white" : "text-gray-900"}>Operational</span></li>
                    </ul>
                </div>
                
                <div className="flex gap-4 mt-2">
                     <Link
                        to="/pathfinder"
                        className={`group relative inline-flex items-center gap-4 px-10 py-5 border rounded-lg font-bold overflow-hidden transition-all ${isDark ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black hover:bg-gray-800"}`}
                    >
                        <span className="font-mono text-lg tracking-widest uppercase">Enter System</span>
                        <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Visual Column Removed per user request */}
         </div>

        {/* --- SECTION 2: THE 4 CARDS (HUD STYLE) --- */}
        <div className="w-full max-w-[1600px] mx-auto relative z-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            
                {/* Card 1: Activity Log */}
                <div className={hudCardStyle}>
                      <CornerAccent />
                      <div className="flex items-center gap-3 mb-6 border-b border-dashed border-gray-700/50 pb-4">
                        <FaListUl className="text-blue-500 text-xl"/>
                        <h3 className={`font-mono text-sm tracking-widest uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>SYSTEM LOGS</h3>
                      </div>
                      <ul className="space-y-4 font-mono text-xs">
                         <li className="flex justify-between items-center">
                            <span className={isDark ? "text-gray-500" : "text-gray-500"}>CORE STATUS</span>
                            <span className="text-green-500 glow-green">ONLINE</span>
                         </li>
                         {latestActivity ? (
                             <li className="flex justify-between items-center">
                                <span className={isDark ? "text-white" : "text-gray-900"}>{latestActivity.type}</span>
                                <span className="text-blue-400">{latestActivity.time}</span>
                             </li>
                         ) : (
                             <li className="flex justify-between items-center text-gray-500">
                                <span>WAITING FOR INPUT...</span>
                                <span>--:--</span>
                             </li>
                         )}
                      </ul>
                </div>

                {/* Card 2: Nearby Devices */}
                <div className={hudCardStyle}>
                      <CornerAccent />
                      <div className="flex items-center gap-3 mb-6 border-b border-dashed border-gray-700/50 pb-4">
                        <FaMapMarkerAlt className="text-purple-500 text-xl"/>
                        <h3 className={`font-mono text-sm tracking-widest uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>ACTIVE UNITS</h3>
                      </div>
                      <div className="flex flex-col items-start gap-2">
                          <div className={`text-5xl font-mono font-bold flex items-baseline gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                             {totalUsers}
                          </div>
                          <p className="text-xs font-mono text-purple-500 uppercase tracking-widest">Global Range</p>
                      </div>
                </div>

                {/* Card 3: Signal Scan */}
                <div className={hudCardStyle}>
                    <CornerAccent />
                    <div className="flex items-center gap-3 mb-6 border-b border-dashed border-gray-700/50 pb-4">
                        <FaWifi className="text-green-500 text-xl"/>
                        <h3 className={`font-mono text-sm tracking-widest uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>NETWORK PING</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                         <div className="flex justify-between text-xs font-mono mb-1">
                             <span className="text-gray-500">STABILITY</span>
                             <span className={totalUsers > 0 ? "text-green-500" : "text-red-500"}>{totalUsers > 0 ? "100%" : "0%"}</span>
                         </div>
                         <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full bg-green-500 transition-all duration-500`} style={{ width: totalUsers > 0 ? '100%' : '5%' }}></div>
                         </div>
                         <p className="text-xs font-mono text-gray-500 mt-2 text-right">FREQ: {totalUsers > 0 ? "50HZ" : "OFF"}</p>
                    </div>
                </div>

                {/* Card 4: Velocity */}
                <div className={hudCardStyle}>
                    <CornerAccent />
                    <div className="flex items-center gap-3 mb-6 border-b border-dashed border-gray-700/50 pb-4">
                        <FaTachometerAlt className="text-red-500 text-xl"/>
                        <h3 className={`font-mono text-sm tracking-widest uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>VELOCITY</h3>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                          <div className={`text-5xl font-mono font-bold flex items-baseline gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                             {maxVelocity ? (maxVelocity * 3.6).toFixed(0) : "00"} <span className="text-sm font-bold text-gray-500">KM/H</span>
                          </div>
                           <p className={`text-xs font-mono uppercase tracking-widest ${maxVelocity > 0 ? "text-green-500 animate-pulse" : "text-gray-600"}`}>
                              {maxVelocity > 0 ? ">> IN MOTION" : ":: STATIONARY"}
                          </p>
                    </div>
                </div>

            </div>
        </div>

      </main>
    </div>
  );
};

export default Home;