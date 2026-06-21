import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { cmsData } from '../data/cmsData.js';
import { SiteConfigContext } from '../App.jsx';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] },
  }),
};

export default function Hero() {
  const config = useContext(SiteConfigContext);
  const { hero } = cmsData;

  const badge = config?.hero?.badge || hero.badge;
  const titleLine1 = config?.hero?.titleLine1 || hero.title.line1;
  const titleAccent = config?.hero?.titleAccent || hero.title.accent;
  const titleLine2 = config?.hero?.titleLine2 || hero.title.line2;
  const subtitle = config?.hero?.subtitle || hero.subtitle;
  const ctaPrimary = config?.hero?.ctaPrimary || hero.ctaPrimary;
  const ctaSecondary = config?.hero?.ctaSecondary || hero.ctaSecondary;
  const ctaPrimaryUrl = config?.hero?.ctaPrimaryUrl || '#contacto';
  const ctaSecondaryUrl = config?.hero?.ctaSecondaryUrl || '#proyectos';
  const statsList = config?.hero?.stats?.length > 0 ? config.hero.stats : hero.stats;
  const bgImage = config?.hero?.backgroundImage || null;

  const handleScroll = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(href.substring(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="inicio" className="hero">
      <div className="hero-bg" style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}} />
      <div className="hero-overlay" />

      <div className="container" style={{ padding: '120px 24px 160px', position: 'relative', zIndex: 2 }}>
        <motion.div
          className="hero-content"
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-badge" variants={fadeUp} custom={0}>
            <span className="hero-badge-dot" />
            {badge}
          </motion.div>

          <motion.h1 className="hero-title" variants={fadeUp} custom={0.15}>
            {titleLine1}<br />
            <span className="hero-title-accent">{titleAccent}</span><br />
            {titleLine2}
          </motion.h1>

          <motion.p className="hero-subtitle" variants={fadeUp} custom={0.3}>
            {subtitle}
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp} custom={0.45}>
            <a
              href={ctaPrimaryUrl}
              className="btn btn-primary btn-lg"
              onClick={(e) => handleScroll(e, ctaPrimaryUrl)}
              target={ctaPrimaryUrl.startsWith('http') ? '_blank' : undefined}
              rel={ctaPrimaryUrl.startsWith('http') ? 'noreferrer' : undefined}
            >
              {ctaPrimary}
              <ArrowRight size={18} />
            </a>
            <a
              href={ctaSecondaryUrl}
              className="btn btn-outline btn-lg"
              style={{ color: 'white', borderColor: 'white' }}
              onClick={(e) => handleScroll(e, ctaSecondaryUrl)}
              target={ctaSecondaryUrl.startsWith('http') ? '_blank' : undefined}
              rel={ctaSecondaryUrl.startsWith('http') ? 'noreferrer' : undefined}
            >
              {ctaSecondary}
            </a>
          </motion.div>
        </motion.div>
      </div>

      <motion.a
        href="#servicios"
        onClick={(e) => handleScroll(e, '#servicios')}
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          color: 'rgba(255,255,255,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span>Explorar</span>
        <ChevronDown size={20} />
      </motion.a>

      <div className="hero-stats">
        <div className="hero-stats-inner">
          {statsList.map((stat, index) => (
            <div className="hero-stat" key={stat.id || stat.label || index}>
              <div className="hero-stat-number">{stat.number}</div>
              <div className="hero-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
