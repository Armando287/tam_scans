"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMangasByIds, Manga } from "@/lib/firestore";
import Link from "next/link";
import Image from "next/image";

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
    <div className="container" style={{ paddingBottom: 100, paddingTop: "calc(var(--navbar-height) + 20px)" }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>📚 Mi Biblioteca</h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <span className="loading-spinner" />
        </div>
      ) : mangas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">Tu biblioteca está vacía</div>
          <p className="empty-state-desc">Guarda los mangas que quieres leer para encontrarlos fácilmente.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>Explorar Mangas</Link>
        </div>
      ) : (
        <div className="manga-grid">
          {mangas.map((manga) => (
            <Link key={manga.id} href={`/manga/${manga.id}`} className="manga-card">
              <div className="manga-card-image">
                <span className={`manga-card-status status-${manga.status}`}>
                  {manga.status === "ongoing" ? "En curso" : manga.status === "completed" ? "Finalizado" : "Pausa"}
                </span>
                {manga.coverUrl ? (
                  <Image
                    src={`/api/proxy?url=${encodeURIComponent(manga.coverUrl)}`}
                    alt={manga.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                    📖
                  </div>
                )}
              </div>
              <div className="manga-card-content">
                <h3 className="manga-card-title">{manga.title}</h3>
                <p className="manga-card-meta">
                  {manga.author}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
