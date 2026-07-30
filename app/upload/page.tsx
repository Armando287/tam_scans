"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getMangas, createChapter, Manga, getChapters } from "@/lib/firestore";

type FileWithProgress = {
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { user, profile, getToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [selectedMangaId, setSelectedMangaId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [fileType, setFileType] = useState<"images" | "pdf">("images");
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importStatus, setImportStatus] = useState<{
    type: "idle" | "fetching_manga" | "fetching_chapters" | "uploading_pages" | "done" | "error";
    totalChapters?: number;
    currentChapter?: number;
    totalPages?: number;
    currentPage?: number;
    message?: string;
  }>({ type: "idle" });

  useEffect(() => {
    getMangas(50).then(setMangas).catch(console.error);
  }, []);

  // Redirect if not logged in or not verified
  if (!user) {
    router.replace("/auth/login");
    return null;
  }

  function addFiles(newFiles: File[]) {
    const validTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    const valid = newFiles.filter((f) => validTypes.includes(f.type) && f.size <= 50 * 1024 * 1024);
    const invalid = newFiles.filter((f) => !valid.includes(f));
    if (invalid.length) showToast(`${invalid.length} archivo(s) inválidos ignorados`, "error");
    if (valid.length === 0) return;

    const isPdf = valid.some((f) => f.type === "application/pdf");
    setFileType(isPdf ? "pdf" : "images");

    setFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({ file: f, progress: 0, status: "waiting" as const })),
    ]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFile(item: FileWithProgress, index: number, token: string) {
    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("mangaId", selectedMangaId);
    formData.append("chapterNumber", chapterNumber);
    formData.append("chapterTitle", chapterTitle);
    formData.append("pageIndex", String(index));
    formData.append("fileType", fileType);

    // Simulate progress (XHR for real progress)
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, progress: pct, status: "uploading" } : f))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, progress: 100, status: "done", url: data.url } : f))
          );
          resolve(data.url);
        } else {
          const err = JSON.parse(xhr.responseText)?.error || "Upload failed";
          setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, status: "error", error: err } : f))
          );
          reject(new Error(err));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));

      const bodyFormData = new FormData();
      bodyFormData.append("file", item.file);
      bodyFormData.append("mangaId", selectedMangaId);
      bodyFormData.append("chapterNumber", chapterNumber);
      bodyFormData.append("chapterTitle", chapterTitle);
      bodyFormData.append("pageIndex", String(index));
      bodyFormData.append("fileType", fileType);
      xhr.send(bodyFormData);
    });
  }

  async function startChapterImport(mangaId: string, chapters: any[]) {
      const existingChapters = await getChapters(mangaId, { allStatuses: true });
      const existingNumbers = new Set(existingChapters.map((c: any) => c.number));
      
      const newChapters = chapters.filter((chap: any) => {
          const num = chap.title.match(/(\d+(\.\d+)?)/)?.[0];
          if (!num) return true;
          if (num.includes('.')) return false; // Skip chapters like 16.1
          return !existingNumbers.has(parseFloat(num));
      });

      if (newChapters.length === 0) {
          showToast("Todos los capítulos encontrados ya han sido subidos previamente.", "error");
          setImportStatus({ type: "idle" });
          return;
      }

      if (!confirm(`Se encontraron ${newChapters.length} capítulos nuevos (se omitieron ${chapters.length - newChapters.length} ya existentes). ¿Deseas descargar y subir todas sus imágenes ahora? ADVERTENCIA: Esto puede tardar mucho tiempo y NO debes cerrar la pestaña.`)) {
          setImportStatus({ type: "idle" });
          return;
      }
      
      setImportStatus({ type: "fetching_chapters", totalChapters: newChapters.length, currentChapter: 0, message: "Iniciando descarga masiva..." });
      
      const token = await getToken();
      
      for (let i = 0; i < newChapters.length; i++) {
          const chap = newChapters[i];
          setImportStatus({ type: "fetching_chapters", totalChapters: newChapters.length, currentChapter: i + 1, message: `Analizando ${chap.title}...` });
          
          try {
             const res = await fetch(`/api/scrape?action=chapter&url=${encodeURIComponent(chap.url)}`);
             const data = await res.json();
             if (!data.images || data.images.length === 0) continue;
             
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
             
             if (finalPages.length > 0) {
                 await createChapter({
                     mangaId: mangaId,
                     number: parseFloat(chapterNumber),
                     title: chap.title,
                     pages: finalPages,
                     fileType: "images",
                     uploadedBy: user!.uid,
                     uploaderEmail: user!.email || "",
                     status: profile?.isAdmin ? "published" : "pending",
                 });
             }
          } catch(e) {
             console.error("Error importing chapter", e);
          }
      }
      
      setImportStatus({ type: "done", message: "¡Importación masiva completada! 🎉" });
      setTimeout(() => {
          setImportStatus({ type: "idle" });
      }, 4000);
  }

  async function handleAutoImport() {
    const url = (document.getElementById("import-url") as HTMLInputElement).value;
    if (!url || !selectedMangaId) return;
    
    setImportStatus({ type: "fetching_manga", message: "Buscando capítulos..." });
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al raspar");
      
      if (data.chapters && data.chapters.length > 0) {
          await startChapterImport(selectedMangaId, data.chapters);
      } else {
          showToast("No se encontraron capítulos.", "error");
          setImportStatus({ type: "idle" });
      }
    } catch (err: any) {
      showToast(err.message, "error");
      setImportStatus({ type: "idle" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMangaId) { showToast("Selecciona un manga", "error"); return; }
    if (!chapterNumber) { showToast("Ingresa el número de capítulo", "error"); return; }
    if (files.length === 0) { showToast("Agrega al menos un archivo", "error"); return; }

    setUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No autenticado");

      const urls: string[] = [];
      let pdfUrl: string | undefined;

      for (let i = 0; i < files.length; i++) {
        const url = await uploadFile(files[i], i, token);
        if (fileType === "pdf") pdfUrl = url;
        else urls.push(url);
      }

      // Save chapter to Firestore
      await createChapter({
        mangaId: selectedMangaId,
        number: Number(chapterNumber),
        title: chapterTitle,
        pages: fileType === "images" ? urls : [],
        fileType,
        pdfUrl,
        uploadedBy: user!.uid,
        uploaderEmail: user!.email || "",
        status: "pending",
      });

      showToast("¡Capítulo subido! Pendiente de aprobación 🎉", "success");
      setSubmitted(true);
    } catch (err: any) {
      showToast(err.message || "Error al subir", "error");
    } finally {
      setUploading(false);
    }
  }

  if (submitted) {
    return (
      <div className="upload-page" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>¡Capítulo enviado!</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          Tu capítulo está pendiente de revisión por un administrador. Será publicado pronto.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => { setSubmitted(false); setFiles([]); setChapterNumber(""); setChapterTitle(""); }}>
            Subir otro capítulo
          </button>
          <button className="btn btn-secondary" onClick={() => router.push("/")}>
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page animate-fade-in">
      {/* Import Progress Overlay */}
      {importStatus.type !== "idle" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>
           <div style={{ background: "var(--card-bg)", padding: 40, borderRadius: 16, width: "100%", maxWidth: 500, textAlign: "center", border: "1px solid var(--border-color)" }}>
               <h2 style={{ marginBottom: 20, color: "var(--text-primary)" }}>
                 {importStatus.type === "done" ? "¡Completado!" : "Importando Capítulos..."}
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

      <div className="upload-header">
        <h1 className="upload-title gradient-text">Subir Scans</h1>
        <p className="upload-subtitle">
          Sube las páginas de un capítulo. Soporta PDF, PNG, JPG y WebP. Máx 50MB por archivo.
        </p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit} id="upload-form">
        {/* Manga & Chapter Info */}
        <div className="upload-section">
          <div className="upload-section-title">📚 Información del capítulo</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label htmlFor="upload-manga-select" className="form-label">Manga</label>
              <select
                id="upload-manga-select"
                className="form-input form-select"
                value={selectedMangaId}
                onChange={(e) => setSelectedMangaId(e.target.value)}
                required
              >
                <option value="">Selecciona un manga...</option>
                {mangas.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div className="form-group">
                <label htmlFor="upload-chapter-number" className="form-label">Capítulo #</label>
                <input
                  id="upload-chapter-number"
                  type="number"
                  className="form-input"
                  placeholder="1"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="upload-chapter-title" className="form-label">Título (opcional)</label>
                <input
                  id="upload-chapter-title"
                  type="text"
                  className="form-input"
                  placeholder="El inicio de todo"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Import from URL Section */}
        <div className="upload-section">
          <div className="upload-section-title">🔗 Importar Capítulos desde URL</div>
          <div className="form-group" style={{ background: "rgba(124,58,237,0.1)", padding: 12, borderRadius: 8, border: "1px dashed var(--accent-primary)" }}>
            <label htmlFor="import-url" className="form-label">URL del Manga (ZonaTMO)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input 
                id="import-url" 
                className="form-input" 
                placeholder="https://zonatmo.org/..." 
                style={{ flex: 1 }} 
              />
              <button 
                className="btn btn-primary" 
                type="button" 
                onClick={handleAutoImport}
                disabled={!selectedMangaId}
              >
                 {importStatus.type !== "idle" && importStatus.type !== "done" ? "⏳" : "Importar"}
              </button>
            </div>
            <small style={{ color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              {!selectedMangaId ? "⚠️ Primero selecciona un manga arriba ⬆️" : "Descargará todos los capítulos que falten de este manga automáticamente (100 en 100)."}
            </small>
          </div>
        </div>

        {/* File Upload */}
        <div className="upload-section">
          <div className="upload-section-title">📁 Archivos</div>

          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            id="upload-drop-zone"
            role="button"
            aria-label="Zona de carga de archivos"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileInput}
              style={{ display: "none" }}
              id="upload-file-input"
            />
            <div className="drop-zone-icon">📂</div>
            <div className="drop-zone-text">
              {dragOver ? "¡Suelta aquí!" : "Toca para seleccionar archivos"}
            </div>
            <div className="drop-zone-hint">
              PDF, PNG, JPG, WebP · Máx 50MB cada uno
            </div>
          </div>

          {files.length > 0 && (
            <div className="upload-file-list" id="upload-file-list">
              {files.map((item, i) => (
                <div key={i} className="upload-file-item" id={`upload-file-item-${i}`}>
                  <span className="upload-status-icon">
                    {item.status === "done" ? "✅" :
                     item.status === "error" ? "❌" :
                     item.status === "uploading" ? "⏳" : "📄"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="upload-file-name">{item.file.name}</div>
                    {item.status === "uploading" && (
                      <div className="upload-progress-bar">
                        <div className="upload-progress-fill" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.error && <div style={{ fontSize: 11, color: "var(--danger)" }}>{item.error}</div>}
                  </div>
                  <span className="upload-file-size">{formatBytes(item.file.size)}</span>
                  {!uploading && item.status !== "done" && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{ color: "var(--text-muted)", fontSize: 16 }}
                      aria-label={`Eliminar ${item.file.name}`}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notice */}
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "var(--radius-md)", padding: 14, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          ℹ️ Tu capítulo será revisado por un administrador antes de publicarse. Asegúrate de tener los derechos del contenido que subes.
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full"
          id="upload-submit-btn"
          disabled={uploading || files.length === 0}
          style={{ animation: uploading ? "none" : "pulse-glow 2s infinite" }}
        >
          {uploading ? (
            <><span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Subiendo...</>
          ) : (
            <>⬆️ Subir capítulo ({files.length} archivo{files.length !== 1 ? "s" : ""})</>
          )}
        </button>
      </form>
    </div>
  );
}
