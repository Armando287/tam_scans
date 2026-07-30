"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getChapter, getChapters, Chapter } from "@/lib/firestore";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getProxyUrl } from "@/lib/image-utils";

type ReadMode = "vertical" | "horizontal" | "webtoon" | "pdf";

const MODE_LABELS: Record<ReadMode, string> = {
  vertical: "↕ Vertical",
  horizontal: "↔ Páginas",
  webtoon: "📜 Webtoon",
  pdf: "📄 PDF",
};

function ReaderImage({ src, alt, priority, style }: { src: string, alt: string, priority?: boolean, style?: React.CSSProperties }) {
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
      {loading && (
         <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="loading-spinner" />
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Cargando...</span>
         </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={800}
        height={1200}
        style={{ ...style, opacity: loading ? 0 : 1, transition: "opacity 0.3s ease-in-out" }}
        unoptimized
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}

function PdfViewer({ url }: { url: string }) {
  return (
    <div className="reader-pdf" style={{ paddingTop: 60 }}>
      <div style={{ width: "100%", maxWidth: 900, padding: "0 0 40px" }}>
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
          style={{
            width: "100%",
            height: "calc(100vh - 60px)",
            border: "none",
            background: "#1a1a1a",
          }}
          title="PDF Viewer"
          id="pdf-iframe-viewer"
        />
      </div>
    </div>
  );
}

function HorizontalReader({ pages, currentPage, onPageChange }: {
  pages: string[];
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPage < pages.length - 1) onPageChange(currentPage + 1);
      if (diff < 0 && currentPage > 0) onPageChange(currentPage - 1);
    }
  }

  return (
    <div
      className="reader-horizontal"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      id="reader-horizontal-container"
    >
      {pages[currentPage] && (
        <div className="reader-horizontal-page">
          <ReaderImage
            src={getProxyUrl(pages[currentPage])}
            alt={`Página ${currentPage + 1}`}
            priority
            style={{ maxWidth: "100%", maxHeight: "calc(100vh - 120px)", objectFit: "contain", width: "auto", height: "auto" }}
          />
        </div>
      )}

      {/* Tap zones */}
      <button
        style={{ position: "absolute", left: 0, top: "10%", bottom: "10%", width: "30%", opacity: 0, cursor: "pointer" }}
        onClick={() => currentPage > 0 && onPageChange(currentPage - 1)}
        aria-label="Página anterior"
        id="reader-tap-prev"
      />
      <button
        style={{ position: "absolute", right: 0, top: "10%", bottom: "10%", width: "30%", opacity: 0, cursor: "pointer" }}
        onClick={() => currentPage < pages.length - 1 && onPageChange(currentPage + 1)}
        aria-label="Página siguiente"
        id="reader-tap-next"
      />

      {/* Bottom nav */}
      <div className="reader-page-nav">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          id="reader-prev-btn"
        >← Ant</button>
        <span className="reader-page-counter">{currentPage + 1} / {pages.length}</span>
        <div className="reader-progress">
          <div
            className="reader-progress-fill"
            style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          />
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(Math.min(pages.length - 1, currentPage + 1))}
          disabled={currentPage === pages.length - 1}
          id="reader-next-btn"
        >Sig →</button>
      </div>
    </div>
  );
}

function VerticalReader({ pages, webtoon }: { pages: string[]; webtoon?: boolean }) {
  return (
    <div
      className="reader-vertical"
      id="reader-vertical-container"
      style={{ gap: webtoon ? 0 : 4 }}
    >
      {pages.map((url, i) => (
        <ReaderImage
          key={i}
          src={getProxyUrl(url)}
          alt={`Página ${i + 1}`}
          priority={i < 3}
          style={{ width: "100%", maxWidth: webtoon ? "none" : 800, height: "auto" }}
        />
      ))}
    </div>
  );
}

export default function ReaderPage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReadMode>("vertical");
  const [currentPage, setCurrentPage] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { profile, refreshProfile } = useAuth();
  const hasMarkedRead = useRef(false);

  // Mark chapter as read
  useEffect(() => {
    if (!profile?.uid || !id || !chapterId || hasMarkedRead.current) return;
    
    const readChapters = profile.readHistory?.[id] || [];
    if (!readChapters.includes(chapterId)) {
      const newHistory = { ...profile.readHistory };
      newHistory[id] = [...readChapters, chapterId];
      
      const updateHistory = async () => {
        const { error } = await supabase
          .from("users")
          .update({ readHistory: newHistory })
          .eq("id", profile.uid);
          
        if (error) {
          console.error(error);
        } else {
          hasMarkedRead.current = true;
          refreshProfile();
        }
      };
      
      updateHistory();
    } else {
      hasMarkedRead.current = true;
    }
  }, [profile, id, chapterId, refreshProfile]);

  // Load saved mode preference
  useEffect(() => {
    const saved = localStorage.getItem("reader-mode") as ReadMode | null;
    if (saved && MODE_LABELS[saved]) setMode(saved);
  }, []);

  useEffect(() => {
    if (!id || !chapterId) return;
    setLoading(true);
    setCurrentPage(0);
    Promise.all([getChapter(chapterId), getChapters(id)])
      .then(([ch, chs]) => {
        setChapter(ch);
        setAllChapters(chs);
        // Force PDF mode for PDF files
        if (ch?.fileType === "pdf") setMode("pdf");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, chapterId]);

  const hideControls = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setControlsVisible(false);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(hideControls, 3000);
  }, [hideControls]);

  useEffect(() => {
    if (mode === "vertical" || mode === "webtoon") {
      showControlsTemporarily();
    } else {
      setControlsVisible(true);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    }
  }, [mode, showControlsTemporarily]);

  function changeMode(m: ReadMode) {
    if (chapter?.fileType === "pdf") return; // Can't change mode for PDF
    setMode(m);
    localStorage.setItem("reader-mode", m);
    setCurrentPage(0);
  }

  const chapterIndex = allChapters.findIndex((c) => c.id === chapterId);
  const prevChapter = chapterIndex > 0 ? allChapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < allChapters.length - 1 ? allChapters[chapterIndex + 1] : null;

  if (loading) {
    return (
      <div className="reader-page" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", display: "flex" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="reader-page" style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 48 }}>❌</span>
        <span style={{ color: "var(--text-secondary)" }}>Capítulo no encontrado</span>
        <Link href={`/manga/${id}`} className="btn btn-primary">Volver al manga</Link>
      </div>
    );
  }

  const isPdf = chapter.fileType === "pdf";
  const pages = chapter.pages || [];

  return (
    <div
      className="reader-page"
      onClick={mode === "vertical" || mode === "webtoon" ? showControlsTemporarily : undefined}
    >
      {/* Top Controls */}
      <div
        className={`reader-controls ${!controlsVisible && (mode === "vertical" || mode === "webtoon") ? "hidden" : ""}`}
        id="reader-top-controls"
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            // Try to go back in history to avoid loops, otherwise push
            if (window.history.length > 2) {
              router.back();
            } else {
              router.push(`/manga/${id}`);
            }
          }}
          className="reader-back-btn"
          id="reader-back-btn"
          aria-label="Volver al manga"
        >
          ←
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Cap. {chapter.number}</div>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {chapter.title || `Capítulo ${chapter.number}`}
          </div>
        </div>

        {/* Mode selector */}
        {!isPdf && (
          <div className="reader-mode-selector" role="group" aria-label="Modo de lectura">
            {(Object.keys(MODE_LABELS) as ReadMode[]).filter(m => m !== "pdf").map((m) => (
              <button
                key={m}
                className={`reader-mode-btn ${mode === m ? "active" : ""}`}
                onClick={() => changeMode(m)}
                id={`reader-mode-${m}`}
                aria-pressed={mode === m}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        )}

        {/* Chapter navigation */}
        <div className="reader-chapter-nav">
          {prevChapter && (
            <Link
              href={`/manga/${id}/read/${prevChapter.id}`}
              replace
              className="btn btn-secondary btn-sm"
              id="reader-prev-chapter-btn"
              title={`Cap. ${prevChapter.number}`}
            >
              ‹
            </Link>
          )}
          {nextChapter && (
            <Link
              href={`/manga/${id}/read/${nextChapter.id}`}
              replace
              className="btn btn-secondary btn-sm"
              id="reader-next-chapter-btn"
              title={`Cap. ${nextChapter.number}`}
            >
              ›
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {isPdf && chapter.pdfUrl ? (
        <PdfViewer url={chapter.pdfUrl} />
      ) : mode === "horizontal" ? (
        <HorizontalReader
          pages={pages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      ) : (
        <VerticalReader pages={pages} webtoon={mode === "webtoon"} />
      )}

      {/* Chapter end navigation */}
      {!isPdf && mode !== "horizontal" && pages.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "40px 20px 60px",
          background: "var(--bg-secondary)",
        }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Fin del capítulo {chapter.number}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {prevChapter && (
              <Link href={`/manga/${id}/read/${prevChapter.id}`} replace className="btn btn-secondary" id="reader-end-prev">
                ← Cap. {prevChapter.number}
              </Link>
            )}
            <button onClick={() => router.back()} className="btn btn-ghost" id="reader-end-index">
              📋 Lista
            </button>
            {nextChapter && (
              <Link href={`/manga/${id}/read/${nextChapter.id}`} replace className="btn btn-primary" id="reader-end-next">
                Cap. {nextChapter.number} →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
