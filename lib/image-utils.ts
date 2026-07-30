export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  if (url.includes("s3.hf.co/GPL12/uploads/")) {
    const path = url.split("s3.hf.co/GPL12/uploads/")[1];
    const parts = path.split("/");
    
    // mangas/ID/chapters/ID/pages/1.webp
    if (parts[0] === "mangas" && parts[2] === "chapters" && parts[4] === "pages") {
        return `/api/proxy?m=${parts[1]}&c=${parts[3]}&image=${parts[5]}`;
    }
    
    // mangas/ID/covers/cover.webp
    if (parts[0] === "mangas" && parts[2] === "covers") {
        return `/api/proxy?m=${parts[1]}&cover=${parts[3]}`;
    }
    
    return `/api/proxy?path=${encodeURIComponent(path)}`;
  }
  
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}
