import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url parameter", { status: 400 });

  let fetchUrl = url;
  
  // Transform S3 URL to HuggingFace Buckets URL to bypass 403 Forbidden
  // https://s3.hf.co/GPL12/uploads/mangas/... -> https://huggingface.co/buckets/GPL12/uploads/resolve/mangas/...
  if (url.includes("s3.hf.co")) {
     const match = url.match(/s3\.hf\.co\/([^\/]+)\/([^\/]+)\/(.*)/);
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
