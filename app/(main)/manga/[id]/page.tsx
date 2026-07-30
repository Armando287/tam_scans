"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { getManga, getChapters, Manga, Chapter } from "@/lib/firestore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";

const CHAPTERS_PER_PAGE = 20;

export default function MangaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getManga(id), getChapters(id)])
      .then(([m, chs]) => {
        setManga(m);
        // Sort chapters numerically
        setChapters(chs.sort((a, b) => b.number - a.number));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Handle Bookmarks
  const isBookmarked = profile?.bookmarks?.includes(id) || false;
  
  const toggleBookmark = async () => {
    if (!user || !profile) {
      showToast("Inicia sesión para guardar mangas", "error");
      router.push("/auth/login");
      return;
    }
    const currentBookmarks = profile.bookmarks || [];
    const newBookmarks = isBookmarked
      ? currentBookmarks.filter((b) => b !== id)
      : [...currentBookmarks, id];
    
    try {
      const { error } = await supabase
        .from("users")
        .update({ bookmarks: newBookmarks })
        .eq("id", user.id);
        
      if (error) throw error;
      
      await refreshProfile();
      showToast(isBookmarked ? "Eliminado de la biblioteca" : "Añadido a la biblioteca", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al actualizar la biblioteca", "error");
    }
  };

  // Get current paginated chapters
  const paginatedChapters = useMemo(() => {
    const start = (currentPage - 1) * CHAPTERS_PER_PAGE;
    return chapters.slice(start, start + CHAPTERS_PER_PAGE);
  }, [chapters, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  // History logic
  const readHistory = profile?.readHistory?.[id] || [];
  
  // Calculate read progress buttons
  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null; // asc order
  const lastReadChapterId = readHistory.length > 0 ? readHistory[readHistory.length - 1] : null; // last added to history
  
  // Find the next chapter after the last read one
  let continueChapter = firstChapter;
  if (lastReadChapterId) {
     const lastReadIdx = chapters.findIndex(c => c.id === lastReadChapterId);
     if (lastReadIdx > 0) {
        // Chapters are sorted descending. So the next one to read is lastReadIdx - 1.
        continueChapter = chapters[lastReadIdx - 1];
     } else if (lastReadIdx === 0) {
        continueChapter = null; // Caught up!
     }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">🚫</div>
        <div className="empty-state-title">Manga no encontrado</div>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20 }}>Ir al Inicio</Link>
      </div>
    );
  }

  const coverUrl = manga.coverUrl ? `/api/proxy?url=${encodeURIComponent(manga.coverUrl)}` : null;

  return (
    <div className="manga-detail-container pb-24">
      {/* Background Blur */}
      {coverUrl && (
        <div className="manga-hero-bg">
           <img src={coverUrl} alt="Background" className="manga-hero-bg-img" />
           <div className="manga-hero-bg-overlay" />
        </div>
      )}

      {/* Header Info */}
      <div className="manga-hero-content">
        <div className="manga-hero-top">
          <button className="manga-hero-back" onClick={() => router.back()}>← Volver</button>
          
          <button 
            className={`manga-hero-bookmark ${isBookmarked ? "active" : ""}`} 
            onClick={toggleBookmark}
          >
            {isBookmarked ? "❤️ Guardado" : "🤍 Guardar"}
          </button>
        </div>

        <div className="manga-hero-main">
          <div className="manga-hero-cover-wrapper">
             {coverUrl ? (
               <img src={coverUrl} alt={manga.title} className="manga-hero-cover" />
             ) : (
               <div className="manga-hero-cover-placeholder">?</div>
             )}
          </div>

          <div className="manga-hero-info">
             <h1 className="manga-hero-title">{manga.title}</h1>
             <div className="manga-hero-author">✍️ {manga.author || "Desconocido"}</div>
             
             <div className="manga-hero-tags">
               <span className="badge badge-published">
                 {manga.status || "En curso"}
               </span>
               {manga.genres?.map(g => (
                 <span key={g} className="badge badge-genre">{g}</span>
               ))}
             </div>
             
             <p className="manga-hero-desc">
               {manga.description || "Sin descripción."}
             </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="manga-hero-actions">
           {chapters.length > 0 ? (
              <>
                 {readHistory.length === 0 ? (
                    <Link href={`/manga/${id}/read/${firstChapter?.id}`} className="btn btn-primary w-full" style={{ padding: "16px", borderRadius: 16 }}>
                      Empezar a leer (Cap {firstChapter?.number})
                    </Link>
                 ) : continueChapter ? (
                    <Link href={`/manga/${id}/read/${continueChapter.id}`} className="btn btn-primary w-full" style={{ padding: "16px", borderRadius: 16 }}>
                      Continuar (Cap {continueChapter.number})
                    </Link>
                 ) : (
                    <button className="btn btn-secondary w-full" disabled style={{ padding: "16px", borderRadius: 16, opacity: 0.7 }}>
                      ¡Estás al día! 🎉
                    </button>
                 )}
              </>
           ) : (
              <button className="btn btn-secondary w-full" disabled style={{ padding: "16px", borderRadius: 16 }}>
                Pronto habrá capítulos
              </button>
           )}
        </div>
      </div>

      {/* Chapters Section */}
      <div className="manga-chapters-section">
        <div className="section-header" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <h2 className="section-title">Capítulos ({chapters.length})</h2>
          {user && (
            <Link href="/upload" className="btn btn-sm btn-ghost" style={{ color: "var(--accent-primary)" }}>
              + Subir
            </Link>
          )}
        </div>

        {chapters.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
             <div className="empty-state-title">No hay capítulos aún</div>
             <div className="empty-state-desc">Sé el primero en subir un capítulo para este manga.</div>
          </div>
        ) : (
          <div className="chapter-list-app">
            {paginatedChapters.map((ch) => {
              const isRead = ch.id ? readHistory.includes(ch.id) : false;
              return (
                <Link
                  key={ch.id}
                  href={`/manga/${id}/read/${ch.id}`}
                  className={`chapter-row ${isRead ? "read" : ""}`}
                >
                  {ch.pages && ch.pages.length > 0 && (
                    <div className="chapter-row-thumb-wrap">
                      <img 
                        src={`/api/proxy?url=${encodeURIComponent(ch.pages[0])}`} 
                        alt={`Cap ${ch.number}`} 
                        className="chapter-row-thumb" 
                      />
                    </div>
                  )}
                  <div className="chapter-row-info">
                    <div className="chapter-row-number">Capítulo {ch.number}</div>
                    {ch.title && <div className="chapter-row-title">{ch.title}</div>}
                    <div className="chapter-row-date">
                       {new Date(ch.createdAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  {isRead && (
                    <div className="chapter-row-read-badge">✓ Visto</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
            <button 
              className="btn btn-secondary" 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Página {currentPage} de {totalPages}
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
