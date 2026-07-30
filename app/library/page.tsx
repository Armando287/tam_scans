"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMangasByIds, Manga } from "@/lib/firestore";
import Link from "next/link";
import MangaCard from "@/components/MangaCard";
export default function LibraryPage() {
  const { user, profile } = useAuth();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchMangas = async () => {
      setLoading(true);
      try {
        if (profile.bookmarks && profile.bookmarks.length > 0) {
          const res = await getMangasByIds(profile.bookmarks);
          setMangas(res);
        } else {
          setMangas([]);
        }
      } catch (err) {
        console.error("Error loading library", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMangas();
  }, [profile]);

  if (!user) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-title">Inicia sesión</div>
        <p className="empty-state-desc">Debes iniciar sesión para ver tu biblioteca.</p>
        <Link href="/auth/login" className="btn btn-primary" style={{ marginTop: 16 }}>Ir al Login</Link>
      </div>
    );
  }

  return (
    <div className="app-layout-page pb-24">
      <div className="app-header">
        <h1 className="app-title">Mi Biblioteca</h1>
      </div>

      {loading ? (
        <div className="manga-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <div className="skeleton" style={{ aspectRatio: "2/3", width: "100%" }} />
            </div>
          ))}
        </div>
      ) : mangas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">Tu biblioteca está vacía</div>
          <div className="empty-state-desc">Guarda los mangas que quieres leer para encontrarlos fácilmente.</div>
          <Link href="/explore" className="btn btn-primary" style={{ marginTop: 16 }}>Explorar Mangas</Link>
        </div>
      ) : (
        <div className="manga-grid animate-fade-in">
          {mangas.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      )}
    </div>
  );
}
