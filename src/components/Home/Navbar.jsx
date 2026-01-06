import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GiPathDistance } from "react-icons/gi";
import { MdHome } from "react-icons/md";
import logo from "../../assets/logo.png"; // Adjust the path as necessary
import { RxHamburgerMenu } from "react-icons/rx";

import { useContext } from "react";
import { ThemeContext } from "./ContextTheme";

const Navbar = () => {
  const {isOpen, setIsOpen} = useContext(ThemeContext);

  const handleHam = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="border-b  border-gray-700 text-white px-2 py-1 w-[500px] gap-3 lg:w-[800px] flex justify-between items-center ">
      <img src={logo} alt="Logo" className="w-20" />
      <RxHamburgerMenu
        className="sm:hidden block text-2xl relative cursor-pointer"
        onClick={handleHam}
      />

      <ul
        className={`${
          isOpen ? "flex absolute top-12 right-2 bg-[#1a1a1a73] px-6 py-2" : "hidden"
        } flex-col sm:flex sm:flex-row gap-6 text-[1rem] items-center justify-center mt-2 sm:mt-0`}
      >
        <li>
          <Link
            to="/"
            className="hover:text-gray-400 flex items-center justify-center gap-1"
          >
            <MdHome />
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/pathfinder"
            className="hover:text-gray-400 flex items-center justify-center gap-1"
          >
            {" "}
            <GiPathDistance />
            PathFinder
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
