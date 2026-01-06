import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import PathFinder from "./PathFinder";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/Home" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/pathfinder" element={<PathFinder />} />
      <Route path="/PathFinder" element={<PathFinder />} />
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
