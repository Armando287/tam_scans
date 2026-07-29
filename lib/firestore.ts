// NOTE: All functions here are client-only (call from "use client" components only)
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  CollectionReference,
  DocumentData,
} from "firebase/firestore";

export interface Manga {
  id?: string;
  title: string;
  description: string;
  coverUrl: string;
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
  author: string;
  artist?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  views?: number;
  rating?: number;
}

export interface Chapter {
  id?: string;
  mangaId: string;
  number: number;
  title: string;
  pages: string[];
  fileType: "images" | "pdf";
  pdfUrl?: string;
  uploadedBy: string;
  uploaderEmail: string;
  status: "pending" | "published" | "rejected";
  createdAt?: Timestamp;
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
  createdAt?: Timestamp;
}

function mangasCol() {
  return collection(db, "mangas") as CollectionReference<DocumentData>;
}

// Mangas
export async function getMangas(limitN = 20): Promise<Manga[]> {
  const q = query(mangasCol(), orderBy("updatedAt", "desc"), limit(limitN));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Manga));
}

export async function getManga(id: string): Promise<Manga | null> {
  const snap = await getDoc(doc(db, "mangas", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Manga;
}

export async function createManga(data: Omit<Manga, "id">): Promise<string> {
  const ref = await addDoc(mangasCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0,
  });
  return ref.id;
}

export async function updateManga(id: string, data: Partial<Manga>): Promise<void> {
  await updateDoc(doc(db, "mangas", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteManga(id: string): Promise<void> {
  await deleteDoc(doc(db, "mangas", id));
}

// Chapters
export async function getChapters(mangaId: string): Promise<Chapter[]> {
  const q = query(
    collection(db, "chapters"),
    where("mangaId", "==", mangaId),
    where("status", "==", "published"),
    orderBy("number", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chapter));
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const snap = await getDoc(doc(db, "chapters", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Chapter;
}

export async function createChapter(data: Omit<Chapter, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "chapters"), {
    ...data,
    createdAt: serverTimestamp(),
    views: 0,
  });
  return ref.id;
}

export async function updateChapterStatus(
  id: string,
  status: Chapter["status"]
): Promise<void> {
  await updateDoc(doc(db, "chapters", id), { status });
}

// Users
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserProfile;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
}
