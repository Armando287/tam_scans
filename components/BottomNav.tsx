"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/", icon: "🏠", label: "Inicio", id: "bottom-nav-home" },
  { href: "/explore", icon: "🔍", label: "Explorar", id: "bottom-nav-explore" },
  { href: "/upload", icon: "⬆️", label: "Subir", id: "bottom-nav-upload", requiresAuth: true },
  { href: "/library", icon: "📚", label: "Biblioteca", id: "bottom-nav-library", requiresAuth: true },
  { href: "/auth/login", icon: "👤", label: "Cuenta", id: "bottom-nav-account", guestOnly: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide in reader/admin pages
  if (pathname?.includes("/read/") || pathname?.startsWith("/admin")) return null;

  const items = navItems.filter((item) => {
    if (item.guestOnly && user) return false;
    if (item.requiresAuth && !user) return false;
    return true;
  });

  // Add profile for logged-in users
  const allItems = user
    ? [...items.filter((i) => !i.guestOnly), { href: "/profile", icon: "👤", label: "Perfil", id: "bottom-nav-profile" }]
    : items;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación inferior">
      <div className="bottom-nav-inner">
        {allItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
              id={item.id}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="bottom-nav-icon" aria-hidden="true">{item.icon}</div>
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
