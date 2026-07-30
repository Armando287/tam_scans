import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import MainLayout from "@/components/MainLayout";

export const metadata: Metadata = {
  title: "MangaVerse — Lee y descubre mangas",
  description: "Plataforma de lectura de mangas con scans de la comunidad. Lee en tu celular o computadora.",
  keywords: "manga, scans, lectura, comics, anime",
  openGraph: {
    title: "MangaVerse",
    description: "Lee y descubre mangas en tu dispositivo favorito",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#080811" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <Sidebar />
            <MainLayout>{children}</MainLayout>
            <BottomNav />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
