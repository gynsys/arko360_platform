import { useState, useEffect } from 'react'
import { sanitizeHtml } from '../../../lib/sanitize'
import { useParams, Link } from 'react-router-dom'
import { blogService } from '../services/blogService'
import { doctorService } from '../../../services/doctorService'
import BlogLayout from '../components/BlogLayout'
import GynSysLoader from '../../../components/common/GynSysLoader'
import SocialLinks from '../../../components/common/SocialLinks'
import AppointmentModal from '../../../components/features/AppointmentModal'
import ContactModal from '../../../components/features/ContactModal'
import CyclePredictorModal from '../../../components/cycle-predictor/CyclePredictorModal'
import { getImageUrl } from '../../../lib/imageUtils'

const getCycleCtaHtml = (primaryColor) => `
<div class="my-10 text-center p-8 bg-gradient-to-br from-pink-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-pink-100 dark:border-pink-900/30 shadow-sm">
    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Toma el control de tu salud hoy mismo!</h3>
    <p class="text-gray-600 dark:text-gray-300 mb-6 max-w-lg mx-auto">
        No necesitas esperar a tu próxima visita. Registra tus datos y genera tu reporte de salud ahora.
    </p>
    
    <a href="#cycle-predictor" class="inline-flex items-center gap-3 px-8 py-4 text-white text-lg font-bold rounded-full shadow-lg hover:brightness-110 transition-all transform hover:-translate-y-1 no-underline" style="background-color: ${primaryColor || '#db2777'}">
        <span class="text-2xl">📊</span>
        <span>Iniciar mi Control de Ciclo</span>
    </a>
    
    <p class="mt-6 text-xs text-gray-500 italic flex items-center justify-center gap-1">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
        Herramienta privada y gratuita para pacientes
    </p>
</div>
`

export default function BlogPostPage() {
  const { slug, postSlug } = useParams()
  const [post, setPost] = useState(null)
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState({ author_name: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' })

  // Magic Link Handler for Cycle Predictor
  useEffect(() => {
    const handleContentClick = (e) => {
      // Traverse up to find anchor tag if clicked on child (like icon or text)
      const link = e.target.closest('a')
      if (link && link.getAttribute('href') === '#cycle-predictor') {
        e.preventDefault()
        setIsCycleModalOpen(true)
      }
    }

    // Attach listener to document to catch dynamically rendered content clicks
    // Using simple document listener is safer for HTML content injection
    document.addEventListener('click', handleContentClick)

    return () => {
      document.removeEventListener('click', handleContentClick)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load doctor and post in parallel
        const [doctorData, postData] = await Promise.all([
          doctorService.getDoctorProfileBySlug(slug),
          blogService.getPostBySlug(postSlug)
        ])

        setDoctor(doctorData)
        setPost(postData)

        // Load comments if it's not service content
        if (!postData.is_service_content) {
          loadComments()
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (slug && postSlug) {
      loadData()
    }
  }, [slug, postSlug])

  const loadComments = async () => {
    try {
      setLoadingComments(true)
      const data = await blogService.getComments(postSlug)
      setComments(data)
    } catch (err) {
      console.error('Error loading comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMessage({ type: '', text: '' })

    try {
      await blogService.createComment(postSlug, newComment)
      setSubmitMessage({ type: 'success', text: '¡Comentario publicado exitosamente!' })
      setNewComment({ author_name: '', content: '' })
      loadComments()
    } catch (err) {
      setSubmitMessage({ type: 'error', text: 'Error al publicar el comentario. Intenta nuevamente.' })
    } finally {
      setSubmitting(false)
    }
  }

  const [relatedPosts, setRelatedPosts] = useState([])
  const [loadingRelated, setLoadingRelated] = useState(false)

  useEffect(() => {
    if (doctor?.slug_url && postSlug) {
      loadRelatedPosts()
    }
  }, [doctor, postSlug])

  const loadRelatedPosts = async () => {
    try {
      setLoadingRelated(true)
      // Fetch all public posts for this doctor
      const allPosts = await blogService.getPublicPosts(doctor.slug_url)

      // Filter out the current post and take top 5
      const others = allPosts
        .filter(p => p.slug !== postSlug) // Exclude current
        .slice(0, 5)

      setRelatedPosts(others)
    } catch (error) {
      console.error("Error loading related posts:", error)
    } finally {
      setLoadingRelated(false)
    }
  }

  if (loading) return <GynSysLoader text="Cargando artículo..." />
  if (!post) return <BlogLayout customDoctor={doctor}><div className="text-center py-10">Artículo no encontrado</div></BlogLayout>

  const isDarkTheme = doctor?.design_template === 'dark' || doctor?.design_template === 'executive_dark';

  return (
    <BlogLayout customDoctor={doctor}>
      <div className="py-12 px-0 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12">

          {/* Main Content Column */}
          <div className="lg:col-span-8">
            <div
              className={`p-4 sm:p-8 rounded-xl shadow-sm transition-colors duration-200 ${isDarkTheme ? 'bg-white dark:bg-gray-800 border dark:border-gray-700' : (!doctor?.theme_container_bg_color ? 'bg-white' : '')
                }`}
              style={(!isDarkTheme && doctor?.theme_container_bg_color) ? { backgroundColor: doctor.theme_container_bg_color } : {}}
            >
              <div className="mb-8">
                <Link to={`/${slug}/blog`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium">
                  &larr; Volver al Blog
                </Link>
              </div>

              {post.cover_image && (
                <img
                  src={getImageUrl(post.cover_image)}
                  alt={post.title}
                  className="w-full h-auto rounded-xl shadow-lg mb-8"
                />
              )}

              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{post.title}</h1>

              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-8 border-b dark:border-gray-700 pb-8">
                <time dateTime={post.published_at}>
                  Publicado el {new Date(post.published_at || post.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
              </div>

              <div className="prose prose-indigo dark:prose-invert prose-lg lg:prose-xl mx-auto text-gray-700 dark:text-gray-300 mb-16">
                <div dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    post.content
                      .replace(/\[\[CTA_CICLO\]\]/g, getCycleCtaHtml(doctor?.theme_primary_color))
                      .replace(/\[CTA_CICLO\]/g, getCycleCtaHtml(doctor?.theme_primary_color))
                      .replace(/\[\[CTA_CICLO_NO_BORRAR\]\]/g, getCycleCtaHtml(doctor?.theme_primary_color))
                  )
                }} />
              </div>

              {/* Social Media Links & Appointment */}
              {doctor && (
                <div className="py-8 mb-10 flex flex-col items-center space-y-8">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700 mb-4"></div>

                  <div className="text-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-6">
                      Sígueme en redes sociales
                    </h3>
                    <SocialLinks doctor={doctor} iconClassName="w-6 h-6" />
                  </div>

                  {/* Contact CTA Footer - Visible on ALL posts */}
                  <div className="w-full mt-6 p-8 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {post.is_service_content ? "¿Te interesa este servicio?" : "¿Tienes dudas sobre tu salud?"}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                      {post.is_service_content
                        ? "Estoy aquí para ayudarte. Agenda una consulta para evaluar tu caso y brindarte la mejor atención."
                        : "Estoy aquí para escucharte y brindarte la orientación que necesitas. No dudes en contactarme."}
                    </p>
                    <button
                      onClick={() => setIsContactModalOpen(true)}
                      className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-200"
                      style={{ backgroundColor: doctor.theme_primary_color || '#4F46E5' }}
                    >
                      Contáctame
                    </button>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              {!post.is_service_content && (
                <div className="border-t dark:border-gray-700 pt-10">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Comentarios ({comments.length})</h3>

                  {/* Comments List */}
                  <div className="space-y-8 mb-12">
                    {loadingComments ? (
                      <GynSysLoader fullScreen={false} text="Cargando comentarios..." color={doctor?.theme_primary_color} />
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg">
                              {comment.author_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{comment.author_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {new Date(comment.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center italic">No hay comentarios aún. ¡Sé el primero en comentar!</p>
                    )}
                  </div>

                  {/* Comment Form */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg transition-colors duration-200">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Deja un comentario</h4>

                    {submitMessage.text && (
                      <div className={`p-4 mb-4 rounded-md ${submitMessage.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                        {submitMessage.text}
                      </div>
                    )}

                    <form onSubmit={handleCommentSubmit}>
                      <div className="mb-4">
                        <label htmlFor="author_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                        <input
                          type="text"
                          id="author_name"
                          required
                          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                          value={newComment.author_name}
                          onChange={(e) => setNewComment({ ...newComment, author_name: e.target.value })}
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div className="mb-4">
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comentario</label>
                        <textarea
                          id="content"
                          required
                          rows={4}
                          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                          value={newComment.content}
                          onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                          placeholder="Escribe tu comentario aquí..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {submitting ? 'Enviando...' : 'Publicar comentario'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8 sticky top-24 self-start">
            {/* Related Posts Widget */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-l-4 pl-3" style={{ borderColor: doctor?.theme_primary_color || '#4F46E5' }}>
                Artículos Relacionados
              </h3>

              {loadingRelated ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="bg-gray-200 dark:bg-gray-700 h-16 w-16 rounded-lg"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : relatedPosts.length > 0 ? (
                <div className="space-y-6">
                  {relatedPosts.map(relPost => (
                    <Link to={`/${slug}/blog/${relPost.slug}`} key={relPost.id} className="group flex space-x-4">
                      <div className="flex-shrink-0 relative overflow-hidden rounded-lg h-20 w-20">
                        {relPost.cover_image ? (
                          <img
                            src={getImageUrl(relPost.cover_image)}
                            alt={relPost.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-2 leading-snug">
                          {relPost.title}
                        </h4>
                        <time className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                          {new Date(relPost.published_at || relPost.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                      </div>
                    </Link>
                  ))}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Link to={`/${slug}/blog`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center justify-center">
                      Ver todos los artículos &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No hay otros artículos por ahora.</p>
              )}
            </div>

            {/* Optional: About Doctor Widget could go here too */}
          </div>

        </div>
      </div>

      {/* Contact Modal */}
      {doctor && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          doctorSlug={slug}
          primaryColor={doctor.theme_primary_color || '#4F46E5'}
        />
      )}

      {/* Cycle Predictor Modal Integration */}
      <CyclePredictorModal open={isCycleModalOpen} onOpenChange={setIsCycleModalOpen} />
    </BlogLayout>
  )
}
