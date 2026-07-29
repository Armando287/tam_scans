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
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
      });
      if (!res.ok) throw new Error("Error fetching ZonaTMO");
      const html = await res.text();
      const $ = cheerio.load(html);

      const title = $("h1, h2, .element-title").first().text().trim() || "Título Desconocido";
      const coverUrl = $("img.book-thumbnail, .book-thumbnail img").first().attr("src") || "";
      const description = $(".synopsis").text().trim() || "";
      const author = $(".book-authors a").first().text().trim() || "";

      // Extract genres
      const genres: string[] = [];
      $(".genres-list .badge, .genres a").each((_, el) => {
        genres.push($(el).text().trim());
      });

      return NextResponse.json({
        title,
        coverUrl,
        description,
        author,
        genres,
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
