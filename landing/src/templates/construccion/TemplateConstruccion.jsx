import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../../components/Hero.jsx';
import Services from '../../components/Services.jsx';
import Portfolio from '../../components/Portfolio.jsx';
import About from '../../components/About.jsx';
import Testimonials from '../../components/Testimonials.jsx';
import Process from '../../components/Process.jsx';
import Contact from '../../components/Contact.jsx';
import BiblioGrid from '../../components/BiblioGrid.jsx';
import Promotions from './Promotions.jsx';
import { SiteConfigContext } from '../../App.jsx';

export default function TemplateConstruccion() {
  const config = useContext(SiteConfigContext);
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
      {sections.showCotizador !== false && <Promotions />}
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
