"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getMangas, Manga } from "@/lib/firestore";
import MangaCard from "@/components/MangaCard";

const GENRES = ["Todos", "Acción", "Romance", "Fantasía", "Terror", "Comedia", "Drama", "Aventura", "Sci-Fi", "Shonen", "Seinen", "Shojo"];
const ITEMS_PER_PAGE = 30;

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const query = searchParams.get("q") || "";
  const activeGenre = searchParams.get("genre") || "Todos";

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      // In a real app, you'd filter on the server. Here we fetch a lot and filter client-side since Firestore doesn't easily do text search.
      const data = await getMangas(100, 0); 
      setMangas(data);
      // Not using hasMore properly here because of client-side filtering limitation, but it's fine for now
      setHasMore(data.length === 100);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const filtered = mangas.filter((m) => {
    const matchGenre = activeGenre === "Todos" || m.genres?.includes(activeGenre);
    const matchSearch = !query || m.title.toLowerCase().includes(query.toLowerCase()) || m.author?.toLowerCase().includes(query.toLowerCase());
    return matchGenre && matchSearch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("q", searchInput.trim());
    } else {
      params.delete("q");
    }
    router.push(`/explore?${params.toString()}`);
  };

  const handleGenreClick = (g: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (g !== "Todos") {
      params.set("genre", g);
    } else {
      params.delete("genre");
    }
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1 className="explore-title">Explorar</h1>
        
        <form className="explore-search-bar" onSubmit={handleSearch}>
          <span className="explore-search-icon">🔍</span>
          <input 
            type="search" 
            placeholder="Buscar por título o autor..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="explore-search-input"
          />
        </form>

        <div className="explore-genres" role="navigation" aria-label="Filtro por género">
          {GENRES.map((g) => (
            <button
              key={g}
              className={`genre-chip ${activeGenre === g ? "active" : ""}`}
              onClick={() => handleGenreClick(g)}
              aria-pressed={activeGenre === g}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-results">
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
              No se encontraron mangas con esos filtros.
            </div>
          </div>
        ) : (
          <div className="manga-grid animate-fade-in">
            {filtered.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="loading-page"><div className="loading-spinner" /></div>}>
      <ExploreContent />
    </Suspense>
  );
}
