import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, Award, ShieldCheck } from 'lucide-react';
import { cmsData } from '../data/cmsData.js';
import { SiteConfigContext } from '../App.jsx';
import { renderTitle } from '../lib/utils';

const iconMap = {
  CheckCircle, Award, Users, ShieldCheck
};

function Counter({ target, suffix }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="about-stat-number">
      {count}{suffix}
    </span>
  );
}

export default function About() {
  const config = React.useContext(SiteConfigContext);
  const { about } = cmsData;

  const title = config?.aboutUs?.title || `${about.title.line1} ${about.title.accent}`;
  const tag = config?.aboutUs?.tag || about.tag;
  const p1 = config?.aboutUs?.p1 || about.p1;
  const p2 = config?.aboutUs?.p2 || about.p2;
  const image = config?.aboutUs?.imageUrl || about.image;
  const statsList = config?.aboutUs?.stats?.length > 0 ? config.aboutUs.stats : about.stats;
  const featuresList = config?.aboutUs?.features?.length > 0 ? config.aboutUs.features : about.features;

  const yearsStat = statsList.find(s => s.label.toLowerCase().includes('año')) || statsList[2] || statsList[0];

  return (
    <section id="nosotros" className="section about">
      <div className="container">
        <div className="about-grid">
          <motion.div
            className="about-images"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <img
              src={image}
              alt="Equipo Arko 360"
              className="about-img-main"
            />
            <div className="about-img-badge">
              <div className="about-img-badge-number">{yearsStat?.number || 15}+</div>
              <div className="about-img-badge-text">Años de<br />Experiencia</div>
            </div>

            <div className="about-stats">
              {statsList.map((stat, index) => (
                <div key={stat.id || index} className="about-stat-card">
                  <Counter target={Number(stat.number) || 0} suffix={stat.suffix} />
                  <div className="about-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="section-tag">
              <Users size={12} />
              {tag}
            </div>
            <h2 className="section-title" style={{ marginBottom: 20 }}>
              {renderTitle(title)}
            </h2>
            <p className="section-subtitle" style={{ marginBottom: 16 }}>
              {p1}
            </p>
            <p className="section-subtitle" style={{ marginBottom: 36 }}>
              {p2}
            </p>

            <div className="about-features">
              {featuresList.map((feature, index) => {
                const Icon = iconMap[feature.icon] || CheckCircle;
                return (
                  <div key={feature.id || index} className="about-feature">
                    <div className="about-feature-icon">
                      {<Icon size={20} strokeWidth={2} />}
                    </div>
                    <div className="about-feature-text">
                      <strong>{feature.title}</strong>
                      <span>{feature.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
