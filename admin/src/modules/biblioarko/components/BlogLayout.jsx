import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doctorService } from '../../../services/doctorService'
import GynSysLoader from '../../../components/common/GynSysLoader'
import AppointmentRequestModal from '../../../components/features/AppointmentRequestModal'
import EndometriosisTestModal from '../../../components/features/EndometriosisTestModal'
import CyclePredictorModal from '../../../components/cycle-predictor/CyclePredictorModal'
import { getImageUrl } from '../../../lib/imageUtils'
import { BottomNav, NavIcons } from '../../../components/common/BottomNav'
import { useAuthStore } from '../../../store/authStore'
import { FiLink } from 'react-icons/fi'
import { useToastStore } from '../../../store/toastStore'
import { copyToClipboard } from '../../../utils/platform'

export default function BlogLayout({ children, customDoctor = null, customLoading = false, customLoadingText = "Cargando..." }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(!customDoctor)
  const [isAppointmentRequestModalOpen, setIsAppointmentRequestModalOpen] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const toast = useToastStore()
  
  const isOwner = isAuthenticated && user && (
    (user.slug_url?.toLowerCase() === slug?.toLowerCase()) || 
    (user.id?.toString() === slug) ||
    (doctor && (user.slug_url === doctor.slug_url || user.id === doctor.id))
  )

  useEffect(() => {
    if (slug && !customDoctor) {
      loadDoctor()
    } else if (customDoctor) {
      setLoading(false)
    }
  }, [slug, customDoctor])

  useEffect(() => {
    // Scroll Lock logic for App Experience
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const loadDoctor = async () => {
    try {
      setLoading(true)
      const data = await doctorService.getDoctorProfileBySlug(slug)
      setDoctor(data)

      // Set primary color CSS variable
      if (data?.theme_primary_color) {
        document.documentElement.style.setProperty(
          '--primary-color',
          data.theme_primary_color
        )
      }

      // Sincronizar clase 'dark' en el <html> exactamente igual que DoctorProfilePage
      // para que el blog herede el mismo tema visual sin discrepancias.
      applyThemeToDocument(data)
    } catch (error) {
      // Si no se puede cargar el doctor, limpiar el modo oscuro para evitar
      // que quede activo de una página anterior.
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } finally {
      setLoading(false)
    }
  }

  const applyThemeToDocument = (docData) => {
    const template = docData?.design_template || 'glass'
    const isDark = template === 'dark' || template === 'executive_dark'
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
  }

  // Apply theme if customDoctor changes
  useEffect(() => {
    if (customDoctor) {
      if (customDoctor.theme_primary_color) {
        document.documentElement.style.setProperty(
          '--primary-color',
          customDoctor.theme_primary_color
        )
      }
      applyThemeToDocument(customDoctor)
    }
  }, [customDoctor])

  const activeLoading = customLoading || loading
  const activeDoctor = customDoctor || doctor

  if (activeLoading) return <GynSysLoader text={customLoadingText} />
  if (!activeDoctor) return <div className="text-center py-10">Doctor no encontrado</div>

  const primaryColor = activeDoctor.theme_primary_color || '#4F46E5'

  const theme = activeDoctor.design_template || 'glass'
  const isDarkTheme = theme === 'dark' || theme === 'executive_dark'

  // Replicar exactamente la lógica de DoctorProfilePage para consistencia visual
  // El tema 'minimal' fuerza fondo blanco puro, igual que en el perfil
  const bodyBgStyle = (activeDoctor.theme_body_bg_color && !isDarkTheme && theme !== 'minimal')
    ? { background: activeDoctor.theme_body_bg_color }
    : {}
  const containerBgColor = isDarkTheme ? null : activeDoctor.theme_container_bg_color

  // Clase de fondo global (idéntica a DoctorProfilePage para coherencia de tema)
  let globalBgClass = ''
  if (!bodyBgStyle.background) {
    if (isDarkTheme) {
      globalBgClass = 'bg-gray-950 text-white'
    } else if (theme === 'minimal') {
      globalBgClass = 'bg-white text-gray-900 transition-colors duration-200'
    } else {
      globalBgClass = 'bg-gradient-to-br from-gray-50 to-gray-100 transition-colors duration-200'
    }
  }

  // Check enabled modules
  // Handle both array of strings and array of objects (depending on backend response format)
  const hasModule = (code) => {
    if (!activeDoctor.enabled_modules) return false
    return activeDoctor.enabled_modules.includes(code) ||
      activeDoctor.enabled_modules.some(m => m.code === code)
  }

  const showEndoTest = hasModule('endometriosis_test')

  return (
    <div
      className={`fixed inset-0 flex flex-col transition-colors duration-200 ${isDarkTheme ? 'dark ' : ''}${globalBgClass}`}
      style={bodyBgStyle}
    >
      {/* Modals */}
      <AppointmentRequestModal
        isOpen={isAppointmentRequestModalOpen}
        onClose={() => setIsAppointmentRequestModalOpen(false)}
        doctorId={activeDoctor.id}
        doctorSlug={slug}
        primaryColor={primaryColor}
      />

      {showEndoTest && (
        <EndometriosisTestModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          primaryColor={primaryColor}
          isDarkMode={isDarkTheme}
          onSchedule={() => setIsAppointmentRequestModalOpen(true)}
        />
      )}

      {/* Blog Navbar */}
      <nav
        className={`sticky top-0 z-50 ${activeDoctor.container_shadow ? 'shadow-lg' : ''} transition-colors duration-200 ${!containerBgColor ? 'bg-white dark:bg-gray-900 dark:border-gray-800' : ''}`}
        style={{
          borderBottom: isDarkTheme ? '1px solid #1f2937' : '3px solid white',
          ...(containerBgColor ? { backgroundColor: containerBgColor } : {})
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Doctor Name */}
            <Link to={`/${activeDoctor.slug_url}`} className="flex items-center space-x-4 hover:opacity-90 transition">
              {activeDoctor.logo_url && (
                <img
                  src={getImageUrl(activeDoctor.logo_url)}
                  alt={`${activeDoctor.nombre_completo} logo`}
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}
              {activeDoctor.nombre_completo && (
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
                  {activeDoctor.nombre_completo}
                </h1>
              )}
            </Link>

            {/* Actions - Hidden on Mobile (using Bottom Nav instead) */}
            <div className="hidden md:flex items-center space-x-4">


              <Link
                to={`/${activeDoctor.slug_url}`}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Inicio</span>
              </Link>

              {showEndoTest && (
                <button
                  onClick={() => setIsTestModalOpen(true)}
                  className="hidden md:block px-4 py-2 border-2 rounded-lg font-bold hover:opacity-75 transition shadow-sm bg-white dark:bg-gray-800"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Test Endometriosis
                </button>
              )}

              <button
                onClick={() => setIsAppointmentRequestModalOpen(true)}
                className="px-4 py-2 rounded-lg text-white font-bold hover:opacity-90 transition shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                Solicitar Cita
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Footer */}
      <footer
        className={`${activeDoctor.container_shadow ? 'shadow-inner' : 'border-t'} transition-colors duration-200 ${!containerBgColor ? 'bg-white dark:bg-gray-800 dark:border-gray-700' : ''}`}
        style={containerBgColor ? { backgroundColor: containerBgColor } : {}}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} {activeDoctor.nombre_completo}. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Cycle Predictor Modal */}
      <CyclePredictorModal open={isCycleModalOpen} onOpenChange={setIsCycleModalOpen} />

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav
        items={[
          {
            icon: <NavIcons.Home />,
            label: 'Inicio',
            action: () => navigate(`/${activeDoctor.slug_url}`),
            isActive: false
          },
          {
            icon: <NavIcons.WhatsApp />,
            label: 'WhatsApp',
            action: () => activeDoctor.whatsapp_url && window.open(activeDoctor.whatsapp_url, '_blank', 'noopener,noreferrer'),
            isActive: false
          },
          isOwner ? {
            icon: <FiLink className="w-5 h-5" />,
            label: 'Link',
            action: () => {
              const url = `${window.location.origin}/${slug}/onboarding`;
              copyToClipboard(url);
              toast.success('Link de Onboarding copiado!');
            },
            isActive: false
          } : {
            icon: <NavIcons.Calendar />,
            label: 'Citas',
            action: () => setIsAppointmentRequestModalOpen(true),
            isActive: isAppointmentRequestModalOpen
          },
          {
            icon: <NavIcons.Blog />,
            label: 'Blog',
            action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
            isActive: true
          }
        ]}
        theme={primaryColor}
      />
    </div>
  )
}
