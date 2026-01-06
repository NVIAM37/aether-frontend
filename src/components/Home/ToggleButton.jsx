import React, { useState } from "react";
import Navbar from "./Navbar";
import { useContext } from "react";
import { ThemeContext } from "./ContextTheme";
import { MdSunny } from "react-icons/md";
import { IoMoonSharp } from "react-icons/io5";

const ToggleButton = () => {
  const { isDark, setIsDark } = useContext(ThemeContext);
  


  
  return (
    <div className="w-full fixed z-50 bg-[#0A131F] flex justify-between items-center">
      <Navbar />
      <button
        onClick={() => setIsDark(!isDark)}
        className={`
        px-6 py-2 rounded-full font-semibold transition-colors duration-300 border-2
        ${
          isDark
            ? "bg-[#0A131F] text-white border-gray-300" // Dark mode
            : "  border-white  text-white"
        } // Light mode
      `}
      >
         {/* Text only on sm and above */}
        <span className="hidden sm:block">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>

        {/* Icon only on small screens */}
        <span className="block sm:hidden text-xl">
          {isDark ? <IoMoonSharp /> : <MdSunny />}
        </span>

      </button>
    </div>
  );
};

export default ToggleButton;
