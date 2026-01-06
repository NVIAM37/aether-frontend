import { Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FilePagesRoute from './FilePagesRoute.jsx'
import ContextTheme from './components/Home/ContextTheme.jsx'







createRoot(document.getElementById('root')).render(
  <Fragment>
    <ContextTheme>
       <FilePagesRoute/>
    </ContextTheme>
   
    
  </Fragment>,
)
