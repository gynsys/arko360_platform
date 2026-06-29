import React, { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import Services from './components/Services.jsx';
import Portfolio from './components/Portfolio.jsx';
import About from './components/About.jsx';
import Testimonials from './components/Testimonials.jsx';
import Process from './components/Process.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import EngineeringTools from './components/EngineeringTools.jsx';

import BiblioGrid from './components/BiblioGrid.jsx';
import BiblioArticle from './components/BiblioArticle.jsx';
import { getSiteConfig } from './services/api.js';
import { Toaster } from 'react-hot-toast';

import TemplateConstruccion from './templates/construccion/TemplateConstruccion.jsx';

// Lazy-loaded heavy components — Three.js engine (~2.8 MB) only downloads
// when the user actually navigates to /arko3d, not on the landing page.
const FEA3DContainer = lazy(() => import('./components/tools/fea3d/FEA3DContainer.jsx'));
const MixDesignCalculator = lazy(() => import('./components/tools/MixDesignCalculator.jsx'));

// Full-screen loading spinner shown while lazy chunks are downloading
function LazyLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
      <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ color: '#94a3b8', fontSize: '14px', fontFamily: 'sans-serif' }}>Cargando herramienta…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export const SiteConfigContext = React.createContext(null);
// basePath is the slug prefix for cloned sites (e.g. '/pablo-milano')
// For the main site it is ''
export const BasePathContext = React.createContext('');

// The main landing page router that decides which template to load
function LandingPage() {
  const config = React.useContext(SiteConfigContext);
  const templateName = config?.template_name || 'construccion';

  // In the future, you can add more templates here
  switch (templateName) {
    case 'construccion':
    default:
      return <TemplateConstruccion />;
  }
}

function BiblioPage() {
  return (
    <main style={{ paddingTop: '120px', minHeight: '80vh', paddingBottom: '60px' }} className="container">
      <div className="text-center" style={{ marginBottom: 48 }}>
        <h1 className="section-title">Biblio<span>ARKO</span></h1>
        <p className="section-subtitle" style={{ margin: '0 auto' }}>
          Explora nuestros artículos, guías y casos de estudio sobre las mejores prácticas en ingeniería.
        </p>
      </div>
      <BiblioGrid />
    </main>
  );
}

function ToolsPage() {
  return (
    <main style={{ paddingTop: '120px', minHeight: '80vh', paddingBottom: '60px' }} className="container">
      <div className="text-center" style={{ marginBottom: 48 }}>
        <h1 className="section-title">Herramientas de <span>Ingeniería</span></h1>
        <p className="section-subtitle" style={{ margin: '0 auto' }}>
          Calculadoras y recursos técnicos para estimación de obra y diseño.
        </p>
      </div>
      <EngineeringTools />
    </main>
  );
}

// Wrapper that loads config for a cloned slug and renders the landing page
function SlugLandingPage() {
  const { slug } = useParams();
  const [config, setConfig] = React.useState(null);

  React.useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/arko/landing_sites/config/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setConfig({ ...data, slug }); })
      .catch(() => {});
  }, [slug]);

  const basePath = `/${slug}`;

  if (!config) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <SiteConfigContext.Provider value={config}>
      <BasePathContext.Provider value={basePath}>
        <Navbar />
        <LandingPage />
        <Footer />
      </BasePathContext.Provider>
    </SiteConfigContext.Provider>
  );
}

export default function App() {
  const [config, setConfig] = React.useState(null);

  React.useEffect(() => {
    getSiteConfig().then(data => {
      if (data) {
        setConfig(data);
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--primary', data.primaryColor);
        }
      }
    });
  }, []);

  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/arko3d');

  // Known non-slug routes
  const knownRoutes = ['biblio', 'herramientas', 'arko3d'];
  const firstSegment = location.pathname.split('/').filter(Boolean)[0];
  const isKnownRoute = !firstSegment || knownRoutes.includes(firstSegment);

  return (
    <SiteConfigContext.Provider value={config}>
      <BasePathContext.Provider value="">
        <Toaster position="top-center" toastOptions={{ className: 'font-sans text-sm shadow-xl' }} />
        {!isAppRoute && isKnownRoute && <Navbar />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/biblio" element={<BiblioPage />} />
          <Route path="/biblio/:slug" element={<BiblioArticle />} />
          <Route path="/herramientas" element={<ToolsPage />} />
          <Route path="/herramientas/diseno-de-mezclas" element={
            <Suspense fallback={<LazyLoader />}><MixDesignCalculator /></Suspense>
          } />
          <Route path="/arko3d" element={
            <Suspense fallback={<LazyLoader />}><FEA3DContainer /></Suspense>
          } />
          {/* Cloned landing sites served under their slug */}
          <Route path="/:slug" element={<SlugLandingPage />} />
        </Routes>
        {!isAppRoute && isKnownRoute && <Footer />}
      </BasePathContext.Provider>
    </SiteConfigContext.Provider>
  );
}
