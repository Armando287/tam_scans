"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getManga, getChapters, Manga, Chapter } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(ts: any) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default function MangaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getManga(id), getChapters(id)])
      .then(([m, c]) => {
        setManga(m);
        setChapters(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span style={{ color: "var(--text-muted)" }}>Cargando manga...</span>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-title">Manga no encontrado</div>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>Volver al inicio</Link>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = { ongoing: "En curso", completed: "Completado", hiatus: "Pausa" };

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <div style={{ padding: "16px 16px 0" }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.back()}
          id="manga-detail-back-btn"
        >
          ← Volver
        </button>
      </div>

      {/* Header */}
      <div className="manga-detail-header">
        <div className="manga-cover-lg">
          {manga.coverUrl ? (
            <Image
              src={`/api/proxy?url=${encodeURIComponent(manga.coverUrl)}`}
              alt={`Portada de ${manga.title}`}
              width={200}
              height={300}
              style={{ width: "100%", height: "auto" }}
              unoptimized
            />
          ) : (
            <div
              style={{
                aspectRatio: "2/3",
                background: "var(--bg-elevated)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
              }}
            >
              📖
            </div>
          )}
        </div>

        <div className="manga-detail-info">
          <h1 className="manga-detail-title">{manga.title}</h1>
          <p className="manga-detail-author">✍️ {manga.author}{manga.artist ? ` · 🎨 ${manga.artist}` : ""}</p>

          <div className="genres-list">
            <span className={`badge badge-${manga.status}`}>
              {STATUS_LABELS[manga.status] || manga.status}
            </span>
            {manga.genres?.map((g) => (
              <span key={g} className="badge badge-genre">{g}</span>
            ))}
          </div>

          <p className="manga-detail-desc">{manga.description}</p>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chapters.length > 0 && (
              <Link
                href={`/manga/${id}/read/${chapters[0].id}`}
                className="btn btn-primary"
                id="manga-read-first-btn"
              >
                📖 Leer desde el inicio
              </Link>
            )}
            {chapters.length > 1 && (
              <Link
                href={`/manga/${id}/read/${chapters[chapters.length - 1].id}`}
                className="btn btn-secondary"
                id="manga-read-last-btn"
              >
                ⏭️ Último capítulo
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="chapters-section">
        <div className="section-header" style={{ padding: "0 0 16px" }}>
          <h2 className="section-title">
            📋 Capítulos <span style={{ color: "var(--text-muted)", fontSize: 16, fontWeight: 400 }}>({chapters.length})</span>
          </h2>
        </div>

        {chapters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Sin capítulos publicados</div>
            {profile?.emailVerified && (
              <Link href="/upload" className="btn btn-primary" style={{ marginTop: 8 }}>
                Subir capítulo
              </Link>
            )}
          </div>
        ) : (
          <div>
            {[...chapters].reverse().map((ch) => (
              <Link
                key={ch.id}
                href={`/manga/${id}/read/${ch.id}`}
                className="chapter-item"
                id={`chapter-item-${ch.id}`}
                aria-label={`Capítulo ${ch.number}: ${ch.title}`}
              >
                {ch.images && ch.images.length > 0 && (
                  <img
                    src={`/api/proxy?url=${encodeURIComponent(ch.images[0])}`}
                    alt={`Miniatura Cap. ${ch.number}`}
                    className="chapter-thumb"
                    loading="lazy"
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chapter-number">Cap. {ch.number}</span>
                    <span className="chapter-date" style={{ marginLeft: "auto" }}>{formatDate(ch.createdAt)}</span>
                  </div>
                  <span className="chapter-title" style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", fontSize: 13, color: "var(--text-secondary)" }}>
                    {ch.title || `Capítulo ${ch.number}`}
                  </span>
                </div>
                <span style={{ color: "var(--text-muted)", flexShrink: 0, paddingLeft: 8 }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
