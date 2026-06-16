import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
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
import MixDesignCalculator from './components/tools/MixDesignCalculator.jsx';
import FEA3DContainer from './components/tools/fea3d/FEA3DContainer.jsx';
import { getSiteConfig } from './services/api.js';
import { Toaster } from 'react-hot-toast';

export const SiteConfigContext = React.createContext(null);

function LandingPage() {
  const config = React.useContext(SiteConfigContext);
  const sections = config?.sections || {
    showAbout: true,
    showServices: true,
    showPortfolio: true,
    showProcess: true,
    showTestimonials: true,
    showBiblio: true,
    showTools: true
  };

  return (
    <main>
      <Hero />
      {sections.showServices !== false && <Services />}
      {sections.showPortfolio !== false && <Portfolio />}
      {sections.showAbout !== false && <About />}
      {sections.showTestimonials !== false && <Testimonials />}
      {sections.showProcess !== false && <Process />}
      {sections.showBiblio !== false && (
        <section className="section bg-white">
          <div className="container">
            <div className="text-center" style={{ marginBottom: 48 }}>
              <div className="section-tag">
                BiblioARKO
              </div>
              <h2 className="section-title" style={{ marginBottom: 16 }}>
                Conocimiento y <br />
                <span>Actualidad Técnica</span>
              </h2>
            </div>
            <BiblioGrid limit={3} />
            <div className="text-center" style={{ marginTop: 48 }}>
              <Link to="/biblio" className="btn btn-outline btn-lg">Ver todos los artículos</Link>
            </div>
          </div>
        </section>
      )}
      <Contact />
    </main>
  );
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

  return (
    <SiteConfigContext.Provider value={config}>
      <Toaster position="top-center" toastOptions={{ className: 'font-sans text-sm shadow-xl' }} />
      {!isAppRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/biblio" element={<BiblioPage />} />
        <Route path="/biblio/:slug" element={<BiblioArticle />} />
        <Route path="/herramientas" element={<ToolsPage />} />
        <Route path="/herramientas/diseno-de-mezclas" element={<MixDesignCalculator />} />
        <Route path="/arko3d" element={<FEA3DContainer />} />
      </Routes>
      {!isAppRoute && <Footer />}
    </SiteConfigContext.Provider>
  );
}
