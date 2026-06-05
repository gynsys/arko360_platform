import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Settings, Building2, Hammer, Ruler, HardHat, Wrench, PenTool } from 'lucide-react';
import { cmsData } from '../data/cmsData.js';
import { SiteConfigContext } from '../App.jsx';
import { renderTitle } from '../lib/utils';

const iconMap = {
  Building2, Hammer, Ruler, HardHat, Wrench, PenTool, Settings
};

export default function Services() {
  const config = useContext(SiteConfigContext);
  const { services } = cmsData;

  const tag = config?.services?.tag || services.tag;
  const title = config?.services?.title || `${services.title.line1} ${services.title.accent}`;
  const subtitle = config?.services?.subtitle || services.subtitle;
  const list = config?.services?.list || services.list;

  return (
    <section id="servicios" className="section services">
      <div className="container">
        <div className="services-header text-center">
          <div className="section-tag">
            <Settings size={12} />
            {tag}
          </div>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            {renderTitle(title)}
          </h2>
          <p className="section-subtitle">
            {subtitle}
          </p>
        </div>

        <div className="services-grid">
          {list.map((service, i) => {
            const Icon = iconMap[service.icon];
            return (
              <motion.div
                key={service.id || service.title}
                className="service-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="service-icon">
                  {Icon && <Icon size={32} strokeWidth={1.5} />}
                </div>
                <h3 className="service-title">{service.title}</h3>
                <p className="service-desc">
                  {service.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
