import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { blogService } from '../services/blogService'
import { doctorService } from '../../../services/doctorService'
import BlogCard from '../components/BlogCard'
import BlogLayout from '../components/BlogLayout'
import GynSysLoader from '../../../components/common/GynSysLoader'

export default function BlogPublicPage() {
  const { slug } = useParams() // Doctor slug
  const [posts, setPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      loadData()
    }
  }, [slug])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPosts(posts)
    } else {
      const lowerTerm = searchTerm.toLowerCase()
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(lowerTerm) ||
        post.description?.toLowerCase().includes(lowerTerm) ||
        post.content?.toLowerCase().includes(lowerTerm)
      )
      setFilteredPosts(filtered)
    }
  }, [searchTerm, posts])

  const loadData = async () => {
    try {
      setLoading(true)
      const [postsData, doctorData] = await Promise.all([
        blogService.getPublicPosts(slug),
        doctorService.getDoctorProfileBySlug(slug)
      ])
      setPosts(postsData)
      setFilteredPosts(postsData)
      setDoctor(doctorData)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <BlogLayout customDoctor={doctor} customLoading={loading} customLoadingText="Cargando artículos...">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Blog de Salud
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
              Artículos y consejos de salud para ti.
            </p>

            {/* Search Bar */}
            <div className="mt-8 max-w-xl mx-auto relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border rounded-2xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 sm:text-sm dark:bg-gray-800 dark:text-white transition duration-200 shadow-sm"
                style={{
                  borderColor: doctor?.theme_primary_color || '#d1d5db',
                  '--tw-ring-color': doctor?.theme_primary_color || '#4f46e5',
                  caretColor: doctor?.theme_primary_color
                }}
                placeholder="Buscar artículos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-12 grid gap-8 max-w-lg mx-auto lg:grid-cols-3 lg:max-w-none">
            {filteredPosts.map((post) => (
              <BlogCard key={post.id} post={post} doctor={doctor} />
            ))}
          </div>
          {posts.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              No hay artículos publicados aún.
            </div>
          )}
        </div>
      </div>
    </BlogLayout>
  )
}
