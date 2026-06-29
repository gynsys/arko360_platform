import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { getArticleBySlug } from '../services/api.js';

export default function BiblioArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const data = await getArticleBySlug(slug);
        setArticle(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  if (loading) return <div className="container" style={{ paddingTop: '160px', minHeight: '60vh', textAlign: 'center' }}>Cargando artículo...</div>;
  
  if (!article) return (
    <div className="container" style={{ paddingTop: '160px', minHeight: '60vh', textAlign: 'center' }}>
      <h2>Artículo no encontrado</h2>
      <Link to="/biblio" className="btn btn-primary" style={{ marginTop: '24px' }}>Volver a BiblioARKO</Link>
    </div>
  );

  return (
    <main style={{ paddingTop: '120px', paddingBottom: '96px', background: 'var(--white)' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <Link to="/biblio" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Volver a los artículos
        </Link>
        
        <div style={{ marginBottom: '40px' }}>
          {article.category && (
            <div className="section-tag" style={{ marginBottom: '16px' }}>
              <Tag size={12} /> {article.category}
            </div>
          )}
          
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(36px, 5vw, 48px)', fontWeight: 900, color: 'var(--secondary)', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
            {article.title}
          </h1>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', color: 'var(--text-muted)', fontSize: '14px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} />
              <span>{article.author || 'Admin'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} />
              <span>{new Date(article.published_at || article.created_at || article.date || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {(article.cover_image || article.imageUrl || article.image) && (
          <img 
            src={article.cover_image || article.imageUrl || article.image} 
            alt={article.title} 
            style={{ width: '100%', borderRadius: '16px', marginBottom: '48px', aspectRatio: '16/9', objectFit: 'cover' }} 
          />
        )}

        <div className="article-content" style={{ fontSize: '18px', lineHeight: 1.8, color: 'var(--text)' }}>
          {article.summary && (
            <p style={{ fontSize: '22px', color: 'var(--text-muted)', marginBottom: '32px', fontStyle: 'italic' }}>
              {article.summary}
            </p>
          )}
          
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      </div>
    </main>
  );
}
