"use client";
import Link from "next/link";
import { Manga } from "@/lib/firestore";
import Image from "next/image";

interface MangaCardProps {
  manga: Manga;
}

const STATUS_LABELS: Record<string, string> = {
  ongoing: "En curso",
  completed: "Completado",
  hiatus: "Pausa",
};

export default function MangaCard({ manga }: MangaCardProps) {
  return (
    <Link
      href={`/manga/${manga.id}`}
      className="manga-card"
      id={`manga-card-${manga.id}`}
      aria-label={`${manga.title} - ${STATUS_LABELS[manga.status] || manga.status}`}
    >
      <div className="manga-card-cover">
        {manga.coverUrl ? (
          <Image
            src={manga.coverUrl}
            alt={`Portada de ${manga.title}`}
            width={200}
            height={300}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className="manga-card-cover-placeholder" aria-hidden="true">📖</div>
        )}

        {/* Status badge */}
        <span
          className={`manga-card-status status-${manga.status}`}
          aria-label={`Estado: ${STATUS_LABELS[manga.status]}`}
        >
          {STATUS_LABELS[manga.status] || manga.status}
        </span>

        {/* Overlay */}
        <div className="manga-card-overlay">
          <span className="manga-card-chapter">
            {manga.genres?.[0] || "Manga"}
          </span>
        </div>
      </div>

      <div className="manga-card-info">
        <h3 className="manga-card-title">{manga.title}</h3>
        <p className="manga-card-meta">{manga.author}</p>
      </div>
    </Link>
  );
}
