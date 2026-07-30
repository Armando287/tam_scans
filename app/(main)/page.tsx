"use client";
import { useEffect, useState, Suspense, useRef } from "react";
import Link from "next/link";
import { getMangas, Manga } from "@/lib/firestore";
import MangaCard from "@/components/MangaCard";

const ITEMS_PER_PAGE = 20;

function HomeContent() {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const data = await getMangas(ITEMS_PER_PAGE, 0);
      setMangas(data);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await getMangas(ITEMS_PER_PAGE, mangas.length);
      setMangas(prev => [...prev, ...data]);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fix: Show featured if there are any, and show all in recent so it doesn't look empty when having few mangas.
  const featuredMangas = mangas.slice(0, 5);
  const recentMangas = mangas; // Show all in recent updates
  const popularMangas = [...mangas].sort((a, b) => b.title.localeCompare(a.title)).slice(0, 6); // Just a visual mock for "Populares" using sorting

  const scrollLeft = () => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: -350, behavior: "smooth" });
  };
  const scrollRight = () => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: 350, behavior: "smooth" });
  };

  return (
    <>
      {/* App Header Mobile */}
      <div className="mobile-app-header">
        <h1 className="mobile-app-title">MangaVerse</h1>
        <Link href="/explore" className="mobile-app-search-btn">🔍</Link>
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>
          <div className="skeleton" style={{ width: "100%", height: 200, borderRadius: 16, marginBottom: 24 }} />
          <div className="skeleton" style={{ width: 150, height: 24, marginBottom: 16 }} />
          <div className="manga-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div className="skeleton" style={{ aspectRatio: "2/3", width: "100%" }} />
              </div>
            ))}
          </div>
        </div>
      ) : mangas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">Aún no hay mangas</div>
          <div className="empty-state-desc">
            ¡Sé el primero en subir contenido a la plataforma!
          </div>
        </div>
      ) : (
        <div className="animate-fade-in pb-24">
          {/* Featured Carousel */}
          {featuredMangas.length > 0 && (
            <div className="featured-section">
              <div className="section-header">
                <h2 className="section-title">Destacados</h2>
              </div>
              <div className="featured-carousel-wrapper">
                <button className="carousel-arrow left desktop-only-arrows" onClick={scrollLeft}>
                  &larr;
                </button>
                <div className="featured-carousel" ref={carouselRef}>
                {featuredMangas.map((manga) => (
                  <Link href={`/manga/${manga.id}`} key={manga.id} className="featured-card">
                    <div className="featured-image-wrap">
                       {manga.coverUrl ? (
                         <img src={`/api/proxy?url=${encodeURIComponent(manga.coverUrl)}`} alt={manga.title} className="featured-image" />
                       ) : (
                         <div className="featured-placeholder">?</div>
                       )}
                       <div className="featured-overlay">
                          <h3 className="featured-title">{manga.title}</h3>
                          <div className="featured-meta">{manga.genres?.slice(0, 2).join(" • ")}</div>
                       </div>
                    </div>
                  </Link>
                ))}
              </div>
              <button className="carousel-arrow right desktop-only-arrows" onClick={scrollRight}>
                &rarr;
              </button>
              </div>
            </div>
          )}

          {/* Recent Updates */}
          <div className="section-header">
            <h2 className="section-title">Últimas actualizaciones</h2>
          </div>
          
          <div className="manga-grid">
            {recentMangas.map((manga) => (
              <MangaCard key={`recent-${manga.id}`} manga={manga} />
            ))}
          </div>

          {/* Populares Section (Extra Content) */}
          {popularMangas.length > 0 && (
            <>
              <div className="section-header" style={{ paddingTop: 16 }}>
                <h2 className="section-title">Populares hoy</h2>
              </div>
              <div className="manga-grid">
                {popularMangas.map((manga) => (
                  <MangaCard key={`popular-${manga.id}`} manga={manga} />
                ))}
              </div>
            </>
          )}
          
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 32, marginBottom: 32 }}>
              <button 
                className="btn btn-secondary" 
                onClick={loadMore} 
                disabled={loadingMore}
                style={{ padding: "12px 32px", borderRadius: "99px", background: "var(--bg-elevated)" }}
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="loading-page"><div className="loading-spinner" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
