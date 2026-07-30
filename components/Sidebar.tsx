"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/", icon: "🏠", label: "Inicio", id: "sidebar-home" },
  { href: "/explore", icon: "🔍", label: "Explorar", id: "sidebar-explore" },
  { href: "/upload", icon: "⬆️", label: "Subir", id: "sidebar-upload", requiresAuth: true },
  { href: "/library", icon: "📚", label: "Biblioteca", id: "sidebar-library", requiresAuth: true },
  { href: "/auth/login", icon: "👤", label: "Cuenta", id: "sidebar-account", guestOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide in reader pages
  if (pathname?.includes("/read/")) return null;

  const items = navItems.filter((item) => {
    if (item.guestOnly && user) return false;
    if (item.requiresAuth && !user) return false;
    return true;
  });

  const allItems = user
    ? [...items.filter((i) => !i.guestOnly), { href: "/profile", icon: "👤", label: "Perfil", id: "sidebar-profile" }]
    : items;

  return (
    <aside className="sidebar-desktop" role="navigation" aria-label="Navegación lateral">
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <Link href="/" className="sidebar-logo">
             MangaVerse
          </Link>
        </div>

        <div className="sidebar-menu">
          {allItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                id={item.id}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
