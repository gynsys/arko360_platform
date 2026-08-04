import React, { useState, useContext, createContext } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layout, LogOut, Menu, X, Home, Settings,
  FileText, Database, Server, Cpu, ChevronRight
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const SidebarContext = createContext(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

const NAV_ITEMS = [
  { name: 'Mis Presupuestos', href: '/budgets',              Icon: FileText, exact: false },
  { name: 'APUpro',           href: '/cost360',              Icon: Database, exact: true  },
  { name: 'Base de Datos',    href: '/cost360/databases',    Icon: Server,   exact: false },
  { name: 'Crear APU con IA', href: '/cost360/ai-generator', Icon: Cpu,      exact: false },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.href;
    return location.pathname.startsWith(item.href);
  };

  const SidebarContent = () => (
    <nav className="flex flex-col h-full py-4">
      {/* Logo inside sidebar on mobile */}
      <div className="flex items-center gap-2 px-4 mb-6 lg:hidden">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
          <Layout size={18} />
        </div>
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
          APUpro
        </span>
      </div>

      <div className="space-y-0.5 px-2 flex-1">
        {NAV_ITEMS.map(({ name, href, Icon, exact }) => {
          const active = exact
            ? location.pathname === href
            : location.pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 rounded-r-none'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
              <span className="flex-1">{name}</span>
              {active && <ChevronRight size={14} className="text-blue-400" />}
            </Link>
          );
        })}
      </div>

      <div className="px-4 pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-mono">APUpro v1.0</p>
      </div>
    </nav>
  );

  const sidebarValue = {
    visible: sidebarVisible,
    setVisible: setSidebarVisible,
    toggle: () => setSidebarVisible(prev => !prev)
  };

  return (
    <SidebarContext.Provider value={sidebarValue}>
      <div className="min-h-screen bg-slate-50 flex flex-col print:block">

      {/* ── TOP HEADER ─────────────────────────────────────────────── */}
      <header className="print:hidden h-14 bg-white border-b border-slate-200 sticky top-0 z-50 flex items-center px-4 gap-3 shadow-sm">
        
        {/* Hamburger (mobile/tablet only) */}
        <button
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        {/* Logo */}
        <button
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/budgets')}
        >
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Layout size={18} />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 hidden sm:block">
            APUpro
          </span>
        </button>

        <div className="flex-1" />

        {/* Portal target for page-level actions */}
        <div id="header-actions-portal" className="flex items-center" />

        {/* Right controls */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            {/* Home */}
            <button
              onClick={() => navigate('/budgets')}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Inicio"
            >
              <Home size={20} />
            </button>
            {/* Settings */}
            <button
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Configuración"
            >
              <Settings size={20} />
            </button>
            {/* Mi Cuenta + Logout */}
            <span className="text-sm font-medium text-slate-600 hidden sm:block ml-1 mr-1">Mi Cuenta</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Iniciar Sesión
          </Link>
        )}
      </header>

      {/* ── BODY (sidebar + content) ──────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR Desktop (always visible lg+) ─────────────────── */}
        {sidebarVisible && (
          <aside className="print:hidden hidden lg:flex lg:flex-col w-60 shrink-0 bg-white border-r-2 border-slate-300 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto shadow-lg">
            <SidebarContent />
          </aside>
        )}

        {/* ── SIDEBAR Mobile Overlay ────────────────────────────────── */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="print:hidden fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="print:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 shadow-xl flex flex-col lg:hidden">
              {/* Close button */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Menú</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent />
              </div>
            </div>
          </>
        )}

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
    </SidebarContext.Provider>
  );
}
