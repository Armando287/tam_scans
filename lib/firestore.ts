// Client for Supabase REST API
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddbcetqueswsszzftmjh.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmNldHF1ZXN3c3N6emZ0bWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzYzNjAsImV4cCI6MjEwMDkxMjM2MH0.TON9YYSoe424lPZHGWwC_SqxDlVzTobiYQ647uHN2WE";

async function supaFetch(path: string, options: RequestInit = {}) {
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...options.headers,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase API Error:", err);
    throw new Error(err);
  }
  return res.json();
}

export interface Manga {
  id?: string;
  title: string;
  description: string;
  coverUrl: string;
  genres: string[]; // store as string array in jsonb
  status: "ongoing" | "completed" | "hiatus";
  author: string;
  artist?: string;
  createdAt?: any;
  updatedAt?: any;
  views?: number;
  rating?: number;
}

export interface Chapter {
  id?: string;
  mangaId: string;
  number: number;
  title: string;
  pages: string[]; // jsonb
  fileType: "images" | "pdf";
  pdfUrl?: string;
  uploadedBy: string;
  uploaderEmail: string;
  status: "pending" | "published" | "rejected";
  createdAt?: any;
  views?: number;
}

export interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isVerified: boolean;
  isBanned: boolean;
  uploadCount: number;
  avatarUrl?: string;
  bookmarks?: string[]; // array of manga ids
  readHistory?: Record<string, string[]>; // { mangaId: [chapterId1, chapterId2] }
  createdAt?: any;
}

// Mangas
export async function getMangas(limitN = 20, offset = 0): Promise<Manga[]> {
  const data = await supaFetch(`mangas?order=updatedAt.desc&limit=${limitN}&offset=${offset}`);
  return data;
}

export async function getMangasByIds(ids: string[]): Promise<Manga[]> {
  if (!ids.length) return [];
  const data = await supaFetch(`mangas?id=in.(${ids.join(",")})`);
  return data;
}

export async function getManga(id: string): Promise<Manga | null> {
  const data = await supaFetch(`mangas?id=eq.${id}&limit=1`);
  return data.length ? data[0] : null;
}

export async function createManga(data: Omit<Manga, "id">): Promise<string> {
  const payload = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0
  };
  const res = await supaFetch(`mangas`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res[0].id;
}

export async function updateManga(id: string, data: Partial<Manga>): Promise<void> {
  await supaFetch(`mangas?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
  });
}

export async function deleteManga(id: string): Promise<void> {
  await supaFetch(`mangas?id=eq.${id}`, { method: "DELETE" });
}

// Chapters
export async function getChapters(mangaId: string, options?: { allStatuses?: boolean }): Promise<Chapter[]> {
  const statusFilter = options?.allStatuses ? "" : "&status=eq.published";
  const data = await supaFetch(`chapters?mangaId=eq.${mangaId}${statusFilter}&order=number.desc&limit=10000`);
  return data;
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const data = await supaFetch(`chapters?id=eq.${id}&limit=1`);
  return data.length ? data[0] : null;
}

export async function createChapter(data: Omit<Chapter, "id">): Promise<string> {
  const payload = {
    ...data,
    createdAt: new Date().toISOString(),
    views: 0
  };
  const res = await supaFetch(`chapters`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res[0].id;
}

export async function updateChapterStatus(id: string, status: Chapter["status"]): Promise<void> {
  await supaFetch(`chapters?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

// Users
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const data = await supaFetch(`users?id=eq.${uid}&limit=1`);
  return data.length ? data[0] : null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const data = await supaFetch(`users`);
  return data;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await supaFetch(`users?id=eq.${uid}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}
