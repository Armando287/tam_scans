"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/", icon: "🏠", label: "Inicio", id: "bottom-nav-home" },
  { href: "/browse", icon: "🔍", label: "Explorar", id: "bottom-nav-browse" },
  { href: "/upload", icon: "⬆️", label: "Subir", id: "bottom-nav-upload", requiresAuth: true, requiresVerified: true },
  { href: "/auth/login", icon: "👤", label: "Cuenta", id: "bottom-nav-account", guestOnly: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  // Hide in reader/admin pages
  if (pathname?.includes("/read/") || pathname?.startsWith("/admin")) return null;

  const items = navItems.filter((item) => {
    if (item.guestOnly && user) return false;
    if (item.requiresAuth && !user) return false;
    if (item.requiresVerified && !profile?.emailVerified) return false;
    return true;
  });

  // Add account for logged-in users
  const allItems = user
    ? [...items.filter((i) => !i.guestOnly), { href: "#account", icon: "👤", label: "Cuenta", id: "bottom-nav-account-user" }]
    : items;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación inferior">
      {allItems.map((item) => {
        const isActive = item.href !== "#account" && (pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href)));
        return (
          <Link
            key={item.id}
            href={item.href === "#account" ? "/" : item.href}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
            id={item.id}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
