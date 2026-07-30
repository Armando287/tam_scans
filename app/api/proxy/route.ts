import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let url = req.nextUrl.searchParams.get("url");
  const path = req.nextUrl.searchParams.get("path");
  const m = req.nextUrl.searchParams.get("m");
  const c = req.nextUrl.searchParams.get("c");
  const image = req.nextUrl.searchParams.get("image");
  const cover = req.nextUrl.searchParams.get("cover");

  let fetchUrl = url;

  if (m && c && image) {
    fetchUrl = `https://huggingface.co/buckets/GPL12/uploads/resolve/mangas/${m}/chapters/${c}/pages/${image}`;
  } else if (m && cover) {
    fetchUrl = `https://huggingface.co/buckets/GPL12/uploads/resolve/mangas/${m}/covers/${cover}`;
  } else if (path) {
    fetchUrl = `https://huggingface.co/buckets/GPL12/uploads/resolve/${path}`;
  } else if (!url) {
    return new NextResponse("Missing URL parameters", { status: 400 });
  }

  // Transform S3 URL to HuggingFace Buckets URL to bypass 403 Forbidden
  if (fetchUrl && fetchUrl.includes("s3.hf.co")) {
     const match = fetchUrl.match(/s3\.hf\.co\/([^\/]+)\/([^\/]+)\/(.*)/);
     if (match) {
         const [, user, repo, path] = match;
         fetchUrl = `https://huggingface.co/buckets/${user}/${repo}/resolve/${path}`;
     }
  }

  try {
     const res = await fetch(fetchUrl, {
         headers: {
             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
         }
     });
     
     if (!res.ok) {
         console.error("Proxy fetch failed:", fetchUrl, res.status);
         return new NextResponse("Error fetching image from source", { status: res.status });
     }
     
     const buffer = await res.arrayBuffer();
     const headers = new Headers();
     headers.set("Content-Type", res.headers.get("content-type") || "image/webp");
     headers.set("Cache-Control", "public, max-age=31536000, immutable");
     
     return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
     console.error("Proxy exception:", error);
     return new NextResponse("Internal Server Error", { status: 500 });
  }
}
