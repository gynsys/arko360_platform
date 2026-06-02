import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EngineeringTools from './components/EngineeringTools.jsx';
import Login from './pages/Login.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export const SiteConfigContext = React.createContext(null);

function App() {
  const config = {
    branding: {
      primaryColor: '#0a4275'
    }
  }; // Dummy config or we could fetch it

  return (
    <AuthProvider>
      <SiteConfigContext.Provider value={config}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute>
                  <EngineeringTools />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </SiteConfigContext.Provider>
    </AuthProvider>
  );
}

export default App;
