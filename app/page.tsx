"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getMangas, Manga } from "@/lib/firestore";
import MangaCard from "@/components/MangaCard";

const GENRES = ["Todos", "Acción", "Romance", "Fantasía", "Terror", "Comedia", "Drama", "Aventura", "Sci-Fi", "Shonen", "Seinen", "Shojo"];

function HomeContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("Todos");

  useEffect(() => {
    setLoading(true);
    getMangas(40)
      .then(setMangas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = mangas.filter((m) => {
    const matchGenre = activeGenre === "Todos" || m.genres?.includes(activeGenre);
    const matchSearch = !query || m.title.toLowerCase().includes(query.toLowerCase()) || m.author?.toLowerCase().includes(query.toLowerCase());
    return matchGenre && matchSearch;
  });

  return (
    <>
      {/* Hero */}
      {!query && (
        <section className="hero animate-fade-in">
          <h1 className="hero-title">
            Lee Manga{" "}
            <span className="gradient-text">sin límites</span>
          </h1>
          <p className="hero-subtitle">
            Scans de la comunidad en tu celular. Lee donde quieras, como quieras.
          </p>
        </section>
      )}

      {query && (
        <div className="section-header animate-fade-in">
          <h1 className="section-title">
            Resultados para &ldquo;<span className="gradient-text">{query}</span>&rdquo;
          </h1>
        </div>
      )}

      {/* Genre Filter */}
      {!query && (
        <div className="genre-filter" role="navigation" aria-label="Filtro por género">
          {GENRES.map((g) => (
            <button
              key={g}
              className={`genre-chip ${activeGenre === g ? "active" : ""}`}
              onClick={() => setActiveGenre(g)}
              id={`genre-chip-${g.toLowerCase()}`}
              aria-pressed={activeGenre === g}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Section label */}
      <div className="section-header">
        <h2 className="section-title">
          {query ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}` : "Últimas actualizaciones"}
        </h2>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="manga-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <div className="skeleton" style={{ aspectRatio: "2/3", width: "100%" }} />
              <div style={{ padding: "10px 12px 12px", background: "var(--bg-card)" }}>
                <div className="skeleton" style={{ height: 14, width: "80%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 12, width: "50%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">Sin resultados</div>
          <div className="empty-state-desc">
            {query ? "No se encontraron mangas con ese título." : "Aún no hay mangas publicados. ¡Sé el primero en subir!"}
          </div>
        </div>
      ) : (
        <div className="manga-grid animate-fade-in">
          {filtered.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
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
