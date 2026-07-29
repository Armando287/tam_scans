"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getMangas, Manga } from "@/lib/firestore";

const GENRES_OPTIONS = ["Acción", "Romance", "Fantasía", "Terror", "Comedia", "Drama", "Aventura", "Sci-Fi", "Shonen", "Seinen", "Shojo", "Misterio", "Deportes"];

interface MangaFormData {
  title: string;
  description: string;
  author: string;
  artist: string;
  coverUrl: string;
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
}

const EMPTY_FORM: MangaFormData = { title: "", description: "", author: "", artist: "", coverUrl: "", genres: [], status: "ongoing" };

export default function AdminMangas() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MangaFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    getMangas(100).then(setMangas).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }
  function openEdit(m: Manga) {
    setForm({ title: m.title, description: m.description, author: m.author, artist: m.artist || "", coverUrl: m.coverUrl, genres: m.genres || [], status: m.status });
    setEditingId(m.id!);
    setShowModal(true);
  }

  function toggleGenre(g: string) {
    setForm((f) => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.author.trim()) { showToast("Título y autor son obligatorios", "error"); return; }
    setSaving(true);
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: editingId ? "update-manga" : "create-manga", id: editingId, data: form }),
    });
    if (res.ok) {
      showToast(editingId ? "Manga actualizado ✅" : "Manga creado ✅", "success");
      setShowModal(false);
      await load();
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error || "Error al guardar"}`, "error");
    }
    setSaving(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    const token = await getToken();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-manga", id }),
    });
    if (res.ok) { showToast("Manga eliminado", "success"); await load(); }
    else showToast("Error al eliminar", "error");
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 className="admin-page-title" style={{ margin: 0 }} id="admin-mangas-title">📚 Mangas</h1>
        <button className="btn btn-primary" onClick={openCreate} id="admin-create-manga-btn">➕ Crear manga</button>
      </div>

      {loading ? (
        <div className="loading-page" style={{ padding: 40 }}><div className="loading-spinner" /></div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table" id="mangas-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Autor</th>
                <th>Estado</th>
                <th>Géneros</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mangas.map((m) => (
                <tr key={m.id} id={`manga-row-${m.id}`}>
                  <td style={{ fontWeight: 600, maxWidth: 180 }}>{m.title}</td>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{m.author}</td>
                  <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                  <td style={{ fontSize: 12 }}>{m.genres?.slice(0, 3).join(", ") || "—"}</td>
                  <td>
                    <div className="data-table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)} id={`manga-edit-${m.id}`}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id!, m.title)} id={`manga-delete-${m.id}`}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {mangas.length === 0 && <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-title">Sin mangas aún</div></div>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" id="manga-form-modal">
            <h2 className="modal-title">{editingId ? "Editar manga" : "Crear manga"}</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group">
                <label htmlFor="manga-form-title" className="form-label">Título *</label>
                <input id="manga-form-title" className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="One Piece" required />
              </div>
              <div className="form-group">
                <label htmlFor="manga-form-author" className="form-label">Autor *</label>
                <input id="manga-form-author" className="form-input" value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} placeholder="Eiichiro Oda" required />
              </div>
              <div className="form-group">
                <label htmlFor="manga-form-artist" className="form-label">Artista (opcional)</label>
                <input id="manga-form-artist" className="form-input" value={form.artist} onChange={e => setForm(f => ({...f, artist: e.target.value}))} placeholder="Nombre del artista" />
              </div>
              <div className="form-group">
                <label htmlFor="manga-form-cover" className="form-label">URL de portada</label>
                <input id="manga-form-cover" className="form-input" value={form.coverUrl} onChange={e => setForm(f => ({...f, coverUrl: e.target.value}))} placeholder="https://..." type="url" />
              </div>
              <div className="form-group">
                <label htmlFor="manga-form-status" className="form-label">Estado</label>
                <select id="manga-form-status" className="form-input form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as any}))}>
                  <option value="ongoing">En curso</option>
                  <option value="completed">Completado</option>
                  <option value="hiatus">Pausa</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Géneros</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {GENRES_OPTIONS.map(g => (
                    <button key={g} type="button" className={`genre-chip ${form.genres.includes(g) ? "active" : ""}`} onClick={() => toggleGenre(g)} id={`genre-toggle-${g}`}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="manga-form-desc" className="form-label">Descripción</label>
                <textarea id="manga-form-desc" className="form-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Sinopsis del manga..." rows={3} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} id="manga-form-cancel">Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="manga-form-save">
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear manga"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
