import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EngineeringTools from './components/EngineeringTools.jsx';

export const SiteConfigContext = React.createContext(null);

function App() {
  const config = {
    branding: {
      primaryColor: '#0a4275'
    }
  }; // Dummy config or we could fetch it

  return (
    <SiteConfigContext.Provider value={config}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/*" element={<EngineeringTools />} />
        </Routes>
      </BrowserRouter>
    </SiteConfigContext.Provider>
  );
}

export default App;
