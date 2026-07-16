import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { FaUserShield, FaUser, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getMegaMenu } from '../services/api.js';
import { SiteConfigContext, BasePathContext } from '../App.jsx';
import { useContext } from 'react';
import { useStructureStore } from './tools/fea3d/useStructureStore';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const siteConfig = useContext(SiteConfigContext);
  const basePath = useContext(BasePathContext); // '' for main site, '/slug' for clones

  const [recentArticles, setRecentArticles] = useState([]);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      const slug = siteConfig?.slug || 'arko360';
      const articles = await getMegaMenu(slug);
      setRecentArticles(articles);
    };
    fetchArticles();
  }, [siteConfig]);

  // Build nav links using the correct base path
  const NAV_LINKS = [
    { label: 'Servicios', href: `${basePath}/#servicios` },
    { label: 'Proyectos', href: `${basePath}/#proyectos` },
    { label: 'Nosotros', href: `${basePath}/#nosotros` },
    { label: 'BiblioARKO', href: '/biblio' },
    { label: 'Aplicaciones', href: '/herramientas' },
  ];
  const ctaHref = `${basePath}/#contacto`;
  
  // ARKO3D Unsaved Changes Logic
  const { elements, isSaved, exportProject } = useStructureStore();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);
  const hasUnsavedChanges = elements.length > 0 && !isSaved;

  const logoUrl = siteConfig?.logoUrl || "/images/logo_aeko360.png";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to handle scroll when navigating back to landing page hashes
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location]);

  const checkUser = () => {
    const userStr = localStorage.getItem('arko_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch(e){ console.error(e); }
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    checkUser();
    window.addEventListener('arko_login', checkUser);
    return () => window.removeEventListener('arko_login', checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('arko_token');
    localStorage.removeItem('arko_user');
    setCurrentUser(null);
    setShowUserDropdown(false);
    // Disparar evento para que otras pestañas o componentes se enteren
    window.dispatchEvent(new Event('arko_logout'));
  };

  const handleLinkClick = (e, href) => {
    // Interceptar navegación si estamos en ARKO3D y hay cambios sin guardar
    if (location.pathname === '/arko3d' && href !== '/arko3d' && hasUnsavedChanges) {
      e.preventDefault();
      setPendingHref(href);
      setShowWarningModal(true);
      return;
    }

    setMobileOpen(false);
    
    // If it's a hash link that corresponds to the current page (main or slug)
    const baseLanding = basePath || '/';
    const isOnLanding = location.pathname === '/' || (basePath && location.pathname === basePath);
    if (href.includes('#') && isOnLanding) {
      e.preventDefault();
      const id = href.split('#')[1];
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', href);
    }
  };

  return (
    <>
      <nav className={`navbar ${scrolled || location.pathname !== '/' ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="navbar-inner">
            <Link to="/" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={logoUrl}
                alt={siteConfig?.siteName || "Ingeniería Arko 360"}
                className={`navbar-logo ${(!scrolled && location.pathname === '/') ? 'navbar-logo-white' : ''}`}
              />
              {siteConfig?.siteName && (
                <span className={`font-bold text-xl ${(!scrolled && location.pathname === '/') ? 'text-white' : 'text-slate-800'}`}>
                  {siteConfig.siteName}
                </span>
              )}
            </Link>

            <ul className="navbar-links">
              {NAV_LINKS.map((link) => (
                <li 
                  key={link.label}
                  className={link.label === 'BiblioARKO' ? 'has-megamenu' : ''}
                  onMouseEnter={() => link.label === 'BiblioARKO' && setIsMegaMenuOpen(true)}
                  onMouseLeave={() => link.label === 'BiblioARKO' && setIsMegaMenuOpen(false)}
                >
                  <Link 
                    to={link.href} 
                    onClick={(e) => handleLinkClick(e, link.href)}
                  >
                    {link.label}
                  </Link>
                  
                  {/* Megamenu for BiblioARKO */}
                  {link.label === 'BiblioARKO' && isMegaMenuOpen && (
                    <motion.div 
                      className="megamenu-container"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="megamenu-inner">
                        <div className="megamenu-grid">
                          {recentArticles.length > 0 ? (
                            recentArticles.map(article => (
                              <Link 
                                to={`/biblio/${article.slug || article.id}`} 
                                key={article.id}
                                className="megamenu-card"
                                onClick={() => setIsMegaMenuOpen(false)}
                              >
                                <div className="megamenu-img-wrapper">
                                  {article.cover_image ? (
                                    <img src={article.cover_image} alt={article.title} />
                                  ) : (
                                    <div className="megamenu-img-placeholder">ARKO360</div>
                                  )}
                                </div>
                                <h5>{article.title}</h5>
                                <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                              </Link>
                            ))
                          ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay artículos recientes.</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </li>
              ))}
              {siteConfig?.tools?.showArko3D !== false && (
                <li>
                  <Link 
                    to="/arko3d" 
                    onClick={(e) => handleLinkClick(e, '/arko3d')}
                    style={{ color: '#f39c12', fontWeight: 'bold' }}
                  >
                    ARKO3D
                  </Link>
                </li>
              )}
            </ul>

            <div className="navbar-actions">
              <Link
                to={ctaHref}
                onClick={(e) => handleLinkClick(e, ctaHref)}
                className="btn btn-primary navbar-cta"
              >
                Cotízame
              </Link>

              {currentUser ? (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button 
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    style={{ background: 'none', border: 'none', color: scrolled || location.pathname !== '/' ? 'var(--text-main)' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', padding: '8px' }}
                  >
                    <FaUser style={{ fontSize: '16px' }} />
                    <span className="hidden sm:inline">{currentUser.name?.split(' ')[0] || 'Usuario'}</span>
                    <FaChevronDown style={{ fontSize: '12px', opacity: 0.7 }} />
                  </button>

                  <AnimatePresence>
                    {showUserDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ position: 'absolute', top: '100%', right: 0, background: '#fff', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '180px', overflow: 'hidden', zIndex: 100, border: '1px solid #eee' }}
                      >
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                          <p style={{ margin: 0, fontWeight: 600, color: '#333', fontSize: '14px' }}>{currentUser.name}</p>
                          <p style={{ margin: 0, color: '#777', fontSize: '12px', wordBreak: 'break-all' }}>{currentUser.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#d32f2f', fontSize: '14px', fontWeight: 500, textAlign: 'left' }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#fef0f0'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <FaSignOutAlt /> Cerrar Sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}

              <a
                href={siteConfig?.slug ? `https://admin.arko360.net/${siteConfig.slug}` : "https://admin.arko360.net/login"}
                target="_blank"
                rel="noreferrer"
                className="navbar-admin-icon"
                title="Acceso Admin Dashboard"
              >
                <FaUserShield className="icon" />
              </a>

              <button
                className="navbar-toggle"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="navbar-mobile open"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            <button
              className="navbar-mobile-close"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={28} />
            </button>

            <img
              src={logoUrl}
              alt="Arko 360"
              style={{ height: 44, marginBottom: 32 }}
            />

            {NAV_LINKS.map((link) => (
              <Link 
                key={link.label} 
                to={link.href} 
                onClick={(e) => handleLinkClick(e, link.href)}
              >
                {link.label}
              </Link>
            ))}

            <Link
              to={ctaHref}
              onClick={(e) => handleLinkClick(e, ctaHref)}
              className="btn btn-primary btn-lg"
              style={{ marginTop: 16 }}
            >
              Solicitar Cotización
            </Link>

            <a
              href={siteConfig?.slug ? `https://admin.arko360.net/${siteConfig.slug}` : "https://admin.arko360.net/login"}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-lg"
              style={{ marginTop: 8, display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <FaUserShield size={20} /> Acceso Admin
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsaved Changes Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg text-center max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">¡Cambios sin guardar!</h3>
            <p className="text-slate-300 mb-6 text-sm">
              Tienes un modelo de ARKO3D activo con cambios sin guardar. Si sales ahora, perderás tu progreso.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button 
                onClick={() => setShowWarningModal(false)} 
                className="px-4 py-2 border border-slate-600 hover:bg-slate-800 text-white rounded text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { 
                  setShowWarningModal(false); 
                  setMobileOpen(false);
                  navigate(pendingHref); 
                  if (pendingHref.startsWith('/#') && pendingHref !== '/#') {
                    setTimeout(() => {
                      const id = pendingHref.replace('/#', '');
                      const el = document.getElementById(id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }} 
                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded text-sm font-bold transition-colors"
              >
                Salir sin guardar
              </button>
              <button 
                onClick={() => { 
                  exportProject(); 
                  setShowWarningModal(false); 
                  setMobileOpen(false);
                  navigate(pendingHref); 
                  if (pendingHref.startsWith('/#') && pendingHref !== '/#') {
                    setTimeout(() => {
                      const id = pendingHref.replace('/#', '');
                      const el = document.getElementById(id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow-md transition-colors"
              >
                Guardar y Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
