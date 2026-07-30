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
              <input
                id="upload-manga-select"
                list="mangas-list"
                className="form-input"
                placeholder="Busca y selecciona un manga..."
                onChange={(e) => {
                  const selectedTitle = e.target.value;
                  const selected = mangas.find(m => m.title === selectedTitle);
                  setSelectedMangaId(selected ? selected.id : "");
                }}
                required
              />
              <datalist id="mangas-list">
                {mangas.map((m) => (
                  <option key={m.id} value={m.title} />
                ))}
              </datalist>
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
