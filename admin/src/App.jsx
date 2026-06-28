import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EngineeringTools from './components/EngineeringTools.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import BlogManagementPage from './pages/admin/BlogManagementPage.jsx';
import SocialGeneratorPage from './modules/biblioarko/pages/social-generator';
import ProfilePage from './pages/admin/ProfilePage.jsx';
import { API_URL } from './services/api';
import { Toaster } from 'react-hot-toast';

export const SiteConfigContext = React.createContext(null);

function App() {
  const [config, setConfig] = useState({
    branding: {
      primaryColor: '#0a4275'
    }
  });

  // Cargar configuración del sitio al montar
  useEffect(() => {
    fetchSiteConfig();
  }, []);

  const fetchSiteConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/arko/config`);
      if (response.ok) {
        const siteConfig = await response.json();
        setConfig(siteConfig);
        // Aplicar el color primario a las variables CSS
        if (siteConfig.branding?.primaryColor) {
          applyThemeColor(siteConfig.branding.primaryColor);
        }
      }
    } catch (error) {
      console.error('Error fetching site config:', error);
    }
  };

  const applyThemeColor = (color) => {
    // Aplicar el color a las variables CSS globales
    document.documentElement.style.setProperty('--primary-color', color);
    // Calcular variantes del color
    document.documentElement.style.setProperty('--primary-color-light', adjustColorOpacity(color, 0.1));
    document.documentElement.style.setProperty('--primary-color-dark', adjustColorOpacity(color, 0.2));
  };

  const adjustColorOpacity = (hex, opacity) => {
    // Convertir hex a rgb y aplicar opacidad
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <SiteConfigContext.Provider value={{ config, setConfig, fetchSiteConfig }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/profile" replace />} />
              <Route path="blog" element={<BlogManagementPage />} />
              <Route path="blog/social-generator/:id" element={<SocialGeneratorPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Rutas para sitios clonados usando el slug */}
            <Route path="/:slug/login" element={<Login />} />
            <Route path="/:slug" element={<Navigate to="admin" replace />} />
            <Route 
              path="/:slug/admin/*" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="blog" element={<BlogManagementPage />} />
              <Route path="blog/social-generator/:id" element={<SocialGeneratorPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SiteConfigContext.Provider>
    </AuthProvider>
  );
}

export default App;

