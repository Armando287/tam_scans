import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
      if (url.includes("zonatmo.org")) {
      const action = searchParams.get("action");
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
      });
      if (!res.ok) throw new Error(`Error fetching ZonaTMO: ${res.status} ${res.statusText}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      if (action === "chapter") {
        const images: string[] = [];
        $("img").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (src && !src.includes("avatar") && src.includes("storage")) {
            images.push(src);
          }
        });
        return NextResponse.json({ images });
      }

      const title = $("h1.element-title").first().text().trim() || "Título Desconocido";
      const coverUrl = $("img.book-thumbnail, .book-thumbnail img").first().attr("src") || "";
      const description = $("#manga-synopsis, .element-description").first().text().trim() || "";
      
      const authors: string[] = [];
      $("a[href*='filter_by=author']").each((_, el) => authors.push($(el).text().trim()));
      const author = authors.join(", ") || "";

      // Extract genres
      const genres: string[] = [];
      $("a.badge-primary[href*='genders']").each((_, el) => {
        genres.push($(el).text().trim());
      });

      // Extract chapters
      const chapters: { title: string, url: string }[] = [];
      $("ul.upload-list li, .chapters-list li, .chapter-list li").each((_, el) => {
        const cTitle = $(el).find("a").first().text().trim();
        const cUrl = $(el).find("a").first().attr("href");
        if (cTitle && cUrl) chapters.push({ title: cTitle, url: cUrl });
      });

      // If no chapters found via lists, search for view_uploads links
      if (chapters.length === 0) {
        $("a[href*='view_uploads']").each((_, el) => {
           const cUrl = $(el).attr("href");
           // Try to infer title from text or just use generic
           const cTitle = $(el).text().trim() || "Capítulo";
           if (cUrl && !chapters.find(c => c.url === cUrl)) {
              chapters.push({ title: cTitle, url: cUrl });
           }
        });
      }

      // Reverse chapters so Chapter 1 is first
      chapters.reverse();

      return NextResponse.json({
        title,
        coverUrl,
        description,
        author,
        genres,
        chapters,
        source: "zonatmo",
        url
      });
    }

    if (url.includes("manhwaweb.com")) {
      return NextResponse.json({ 
        error: "ManhwaWeb es una SPA con API oculta. Usa importación manual por ahora." 
      }, { status: 400 });
    }

    if (url.includes("yupmanga.com")) {
      return NextResponse.json({ 
        error: "YupManga bloquea bots con Cloudflare. Usa importación manual." 
      }, { status: 403 });
    }

    return NextResponse.json({ error: "Sitio no soportado o URL inválida." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
