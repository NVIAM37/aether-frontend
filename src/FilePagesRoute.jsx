import React from 'react'
import { BrowserRouter as Router } from "react-router-dom";
import ToggleButton from './components/Home/ToggleButton';
import AppRoutes from './components/Home/Routes';


const FilePagesRoute = () => {
  return (
    <Router>
      {/* <Navbar/> */}
      {/* <ToggleButton/> */}
      <AppRoutes />
    </Router>
  )
}

export default FilePagesRoute
