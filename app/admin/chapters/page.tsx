"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface Chapter {
  id: string;
  mangaId: string;
  number: number;
  title: string;
  status: "pending" | "published" | "rejected";
  uploaderEmail: string;
  fileType: "images" | "pdf";
  createdAt: any;
  pages?: string[];
  pdfUrl?: string;
}

function formatDate(ts: any) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminChapters() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "published" | "rejected">("pending");
  const [acting, setActing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin?action=chapters", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setChapters(data.chapters);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function doAction(action: string, chapterId: string, label: string) {
    setActing(chapterId);
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: chapterId }),
    });
    if (res.ok) {
      showToast(label, "success");
      await load();
    } else {
      showToast("Error al ejecutar acción", "error");
    }
    setActing(null);
  }

  const filtered = chapters.filter((c) => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch = !search || 
      c.mangaId.toLowerCase().includes(search.toLowerCase()) || 
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.uploaderEmail?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 className="admin-page-title" style={{ margin: 0 }} id="admin-chapters-title">📋 Capítulos</h1>
        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input 
            type="text" 
            className="admin-search-input" 
            placeholder="Buscar por ID, título o email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["pending", "published", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f)}
            id={`chapters-filter-${f}`}
          >
            {f === "pending" ? `⏳ Pendientes (${chapters.filter(c => c.status === "pending").length})` :
             f === "published" ? "✅ Publicados" :
             f === "rejected" ? "❌ Rechazados" : "🗂️ Todos"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page" style={{ padding: 40 }}><div className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">
            {filter === "pending" ? "¡Sin pendientes! Todo revisado." : "Sin capítulos en esta categoría"}
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table" id="chapters-table">
            <thead>
              <tr>
                <th>Manga ID</th>
                <th>Cap.</th>
                <th>Título</th>
                <th>Tipo</th>
                <th>Subido por</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((ch) => (
                <tr key={ch.id} id={`chapter-row-${ch.id}`}>
                  <td style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                    <a href={`/manga/${ch.mangaId}`} target="_blank" rel="noopener" style={{ color: "var(--accent-secondary)" }}>
                      {ch.mangaId.slice(0, 8)}…
                    </a>
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--accent-secondary)" }}>#{ch.number}</td>
                  <td style={{ maxWidth: 140 }}>{ch.title || "—"}</td>
                  <td><span className="badge badge-genre">{ch.fileType}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{ch.uploaderEmail}</td>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(ch.createdAt)}</td>
                  <td>
                    <span className={`badge badge-${ch.status}`}>
                      {ch.status === "pending" ? "Pendiente" : ch.status === "published" ? "Publicado" : "Rechazado"}
                    </span>
                  </td>
                  <td>
                    <div className="data-table-actions">
                      {ch.status !== "published" && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => doAction("approve-chapter", ch.id, "Capítulo aprobado ✅")}
                          disabled={acting === ch.id}
                          id={`chapter-approve-${ch.id}`}
                        >
                          {acting === ch.id ? "..." : "Aprobar"}
                        </button>
                      )}
                      {ch.status !== "rejected" && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => doAction("reject-chapter", ch.id, "Capítulo rechazado")}
                          disabled={acting === ch.id}
                          id={`chapter-reject-${ch.id}`}
                        >
                          Rechazar
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { if(confirm("¿Eliminar permanentemente?")) doAction("delete-chapter", ch.id, "Capítulo eliminado"); }}
                        disabled={acting === ch.id}
                        id={`chapter-delete-${ch.id}`}
                        style={{ opacity: 0.7 }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length > 0 && (
            <div className="pagination">
              <div className="pagination-info">
                Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
              </div>
              <div className="pagination-controls">
                <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
                  Anterior
                </button>
                <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(c => c + 1)}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
