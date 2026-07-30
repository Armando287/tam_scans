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
  
  // Scraper states
  const [pendingChapters, setPendingChapters] = useState<{title: string, url: string}[]>([]);
  const [importStatus, setImportStatus] = useState<{
    type: "idle" | "fetching_manga" | "fetching_chapters" | "uploading_pages" | "done" | "error";
    totalChapters?: number;
    currentChapter?: number;
    totalPages?: number;
    currentPage?: number;
    message?: string;
  }>({ type: "idle" });

  async function load() {
    setLoading(true);
    getMangas(100).then(setMangas).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openCreate() { 
    setForm(EMPTY_FORM); 
    setEditingId(null); 
    setPendingChapters([]);
    setShowModal(true); 
  }
  
  function openEdit(m: Manga) {
    setForm({ title: m.title, description: m.description, author: m.author, artist: m.artist || "", coverUrl: m.coverUrl, genres: m.genres || [], status: m.status });
    setEditingId(m.id!);
    setPendingChapters([]);
    setShowModal(true);
  }

  function toggleGenre(g: string) {
    setForm((f) => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }));
  }

  async function handleAutoImport() {
    const url = (document.getElementById("manga-form-import") as HTMLInputElement).value;
    if (!url) return;
    
    setImportStatus({ type: "fetching_manga", message: "Buscando datos del manga..." });
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al raspar");
      
      setForm(f => ({
        ...f,
        title: data.title || f.title,
        description: data.description || f.description,
        author: data.author || f.author,
        coverUrl: data.coverUrl || f.coverUrl,
        genres: data.genres?.length ? data.genres : f.genres,
      }));
      
      if (data.chapters && data.chapters.length > 0) {
          setPendingChapters(data.chapters);
          showToast(`¡Éxito! Manga y ${data.chapters.length} capítulos encontrados.`, "success");
      } else {
          showToast("Datos importados, pero no se encontraron capítulos.", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setImportStatus({ type: "idle" });
    }
  }

  async function startChapterImport(mangaId: string, chapters: any[]) {
      // Fetch existing chapters to avoid duplicates
      const { getChapters } = await import('@/lib/firestore');
      const existingChapters = await getChapters(mangaId, { allStatuses: true });
      const existingNumbers = new Set(existingChapters.map(c => c.number));
      
      const newChapters = chapters.filter(chap => {
          const num = chap.title.match(/(\d+(\.\d+)?)/)?.[0];
          if (!num) return true;
          if (num.includes('.')) return false; // Skip chapters like 16.1
          return !existingNumbers.has(parseFloat(num));
      });

      if (newChapters.length === 0) {
          alert("Todos los capítulos encontrados ya han sido subidos previamente.");
          setShowModal(false);
          await load();
          return;
      }

      if (!confirm(`Se encontraron ${newChapters.length} capítulos nuevos (se omitieron ${chapters.length - newChapters.length} ya existentes). ¿Deseas descargar y subir todas sus imágenes ahora? ADVERTENCIA: Esto puede tardar mucho tiempo y NO debes cerrar la pestaña.`)) {
          setShowModal(false);
          await load();
          return;
      }
      
      setImportStatus({ type: "fetching_chapters", totalChapters: newChapters.length, currentChapter: 0, message: "Iniciando descarga masiva..." });
      
      const token = await getToken();
      
      for (let i = 0; i < newChapters.length; i++) {
          const chap = newChapters[i];
          setImportStatus({ type: "fetching_chapters", totalChapters: newChapters.length, currentChapter: i + 1, message: `Analizando ${chap.title}...` });
          
          try {
             // 1. Get images for chapter
             const res = await fetch(`/api/scrape?action=chapter&url=${encodeURIComponent(chap.url)}`);
             const data = await res.json();
             if (!data.images || data.images.length === 0) continue;
             
             // 2. Upload images in batches of 5
             const uploadedPages: string[] = new Array(data.images.length);
             const chapterNumber = chap.title.match(/(\d+(\.\d+)?)/)?.[0] || String(i+1);
             
             let completedPages = 0;
             const MAX_CONCURRENCY = 100;
             
             const uploadTasks = data.images.map((imgUrl: string, j: number) => async () => {
                 const upRes = await fetch("/api/upload/external", {
                     method: "POST",
                     headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                     body: JSON.stringify({
                         url: imgUrl,
                         mangaId: mangaId,
                         chapterNumber: chapterNumber,
                         pageIndex: String(j)
                     })
                 });
                 if (upRes.ok) {
                     const upData = await upRes.json();
                     uploadedPages[j] = upData.url;
                 }
                 completedPages++;
                 setImportStatus({ 
                    type: "uploading_pages", 
                    totalChapters: newChapters.length, 
                    currentChapter: i + 1,
                    totalPages: data.images.length,
                    currentPage: completedPages,
                    message: `Subiendo imágenes (${completedPages}/${data.images.length}) del ${chap.title} 🚀`
                 });
             });

             for (let t = 0; t < uploadTasks.length; t += MAX_CONCURRENCY) {
                 const batch = uploadTasks.slice(t, t + MAX_CONCURRENCY);
                 await Promise.all(batch.map((task: any) => task()));
             }
             
             const finalPages = uploadedPages.filter(Boolean);
             
             // 3. Create chapter in DB
             if (finalPages.length > 0) {
                 const adminRes = await fetch("/api/admin", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "create-chapter",
                        data: {
                            manga_id: mangaId,
                            title: chap.title,
                            number: parseFloat(chapterNumber),
                            pages: finalPages
                        }
                    })
                 });
                 if (!adminRes.ok) {
                     const errData = await adminRes.json();
                     console.error("Failed to create chapter in DB:", errData);
                     alert("Error al guardar capítulo en BD: " + (errData.error || "Desconocido"));
                 }
             }
          } catch(e) {
             console.error("Error importing chapter", e);
          }
      }
      
      setImportStatus({ type: "done", message: "¡Importación masiva completada! 🎉" });
      setTimeout(() => {
          setImportStatus({ type: "idle" });
          setPendingChapters([]);
          setShowModal(false);
          load();
      }, 4000);
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
    
    setSaving(false);
    
    if (res.ok) {
      const savedData = await res.json();
      showToast(editingId ? "Manga actualizado ✅" : "Manga creado ✅", "success");
      
      const mangaId = editingId || savedData.id;
      
      if (mangaId && pendingChapters.length > 0) {
          // If we have pending chapters, trigger the mass import (for new or existing manga)
          await startChapterImport(mangaId, pendingChapters);
      } else {
          setShowModal(false);
          await load();
      }
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error || "Error al guardar"}`, "error");
    }
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
      {/* Import Progress Overlay */}
      {importStatus.type !== "idle" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>
           <div style={{ background: "var(--card-bg)", padding: 40, borderRadius: 16, width: "100%", maxWidth: 500, textAlign: "center", border: "1px solid var(--border-color)" }}>
               <h2 style={{ marginBottom: 20, color: "var(--text-primary)" }}>
                 {importStatus.type === "done" ? "¡Completado!" : "Importando Manga..."}
               </h2>
               
               <p style={{ color: "var(--text-secondary)", marginBottom: 30, fontSize: 16 }}>{importStatus.message}</p>
               
               {importStatus.type !== "fetching_manga" && importStatus.type !== "done" && (
                 <>
                   <div style={{ marginBottom: 15 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13, color: "var(--text-muted)" }}>
                        <span>Progreso de Capítulos</span>
                        <span>{importStatus.currentChapter} / {importStatus.totalChapters}</span>
                     </div>
                     <div style={{ height: 8, background: "var(--bg-primary)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "var(--accent-primary)", width: `${((importStatus.currentChapter || 0) / (importStatus.totalChapters || 1)) * 100}%`, transition: "width 0.3s ease" }} />
                     </div>
                   </div>
                   
                   {importStatus.type === "uploading_pages" && (
                       <div>
                         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13, color: "var(--text-muted)" }}>
                            <span>Descargando/Subiendo Imágenes</span>
                            <span>{importStatus.currentPage} / {importStatus.totalPages}</span>
                         </div>
                         <div style={{ height: 8, background: "var(--bg-primary)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", background: "#10b981", width: `${((importStatus.currentPage || 0) / (importStatus.totalPages || 1)) * 100}%`, transition: "width 0.3s ease" }} />
                         </div>
                       </div>
                   )}
                 </>
               )}
               
               {importStatus.type !== "done" && importStatus.type !== "fetching_manga" && (
                   <p style={{ color: "#ef4444", fontSize: 13, marginTop: 20, fontWeight: 500 }}>
                     ⚠️ NO CIERRES ESTA PESTAÑA HASTA QUE TERMINE
                   </p>
               )}
           </div>
        </div>
      )}

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
              <div className="form-group" style={{ background: "rgba(124,58,237,0.1)", padding: 12, borderRadius: 8, border: "1px dashed var(--accent-primary)" }}>
                <label htmlFor="manga-form-import" className="form-label">Auto-importar / Actualizar desde URL</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input id="manga-form-import" className="form-input" placeholder="https://zonatmo.org/..." style={{ flex: 1 }} />
                  <button className="btn btn-primary" type="button" onClick={handleAutoImport} id="import-btn">
                     {importStatus.type === "fetching_manga" ? "⏳" : "Importar"}
                  </button>
                </div>
                <small style={{ color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                  {editingId ? "Actualizará los datos vacíos y buscará nuevos capítulos." : "Obtendrá portada, título, descripción y capítulos."} Soporta: ZonaTMO
                </small>
              </div>
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
