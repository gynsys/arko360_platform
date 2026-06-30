import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { SiteConfigContext } from '../App.jsx';
import { getRecentArticles } from '../services/api.js';

export default function BiblioGrid({ limit = null }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  const siteConfig = useContext(SiteConfigContext);

  useEffect(() => {
    const fetchArticles = async () => {
      if (page > 0) setLoadingMore(true);
      try {
        const slug = siteConfig?.slug || 'arko360';
        const fetchedArticles = await getRecentArticles(slug, limit || PAGE_SIZE, page * (limit || PAGE_SIZE));
        if (fetchedArticles.length < (limit || PAGE_SIZE)) {
          setHasMore(false);
        }
        if (page === 0) {
          setArticles(fetchedArticles);
        } else {
          setArticles(prev => [...prev, ...fetchedArticles]);
        }
      } catch (err) {
        console.error("Error fetching articles:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchArticles();
  }, [limit, siteConfig, page]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  if (loading) return <div className="text-center py-12">Cargando artículos...</div>;

  return (
    <div className="portfolio-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
      {articles.map((article, i) => (
        <motion.div
          key={article.id || article._id}
          className="card"
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          whileHover={{ y: -8 }}
        >
          <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
            <img 
              src={article.cover_image || article.imageUrl || article.image} 
              alt={article.title} 
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
              className="article-img"
            />
            {article.category && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'var(--primary)',
                color: 'var(--white)',
                padding: '4px 12px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {article.category}
              </div>
            )}
          </div>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', fontSize: '13px', marginBottom: '12px' }}>
              <Calendar size={14} />
              <span>{new Date(article.published_at || article.created_at || article.date).toLocaleDateString()}</span>
            </div>
            
            <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--secondary)', lineHeight: 1.2, marginBottom: '12px' }}>
              <Link to={`/biblio/${article.slug?.current || article.slug || article.id}`} style={{ color: 'inherit' }}>
                {article.title}
              </Link>
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
              {article.summary || article.excerpt}
            </p>
            
            <Link 
              to={`/biblio/${article.slug?.current || article.slug || article.id}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '14px' }}
            >
              Leer Artículo <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      ))}
      
      {hasMore && !limit && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '24px' }}>
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 24px',
              background: 'var(--primary)',
              color: 'var(--white)',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              cursor: loadingMore ? 'wait' : 'pointer',
              opacity: loadingMore ? 0.7 : 1,
              transition: 'all 0.3s'
            }}
          >
            {loadingMore ? 'Cargando...' : 'Cargar más artículos'}
          </button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .card:hover .article-img {
          transform: scale(1.05);
        }
      `}} />
    </div>
  );
}
