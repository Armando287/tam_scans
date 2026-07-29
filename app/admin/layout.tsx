"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", id: "admin-nav-dashboard" },
  { href: "/admin/chapters", label: "Capítulos", icon: "📋", id: "admin-nav-chapters", badgeKey: "pending" },
  { href: "/admin/mangas", label: "Mangas", icon: "📚", id: "admin-nav-mangas" },
  { href: "/admin/users", label: "Usuarios", icon: "👥", id: "admin-nav-users" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile, loading, getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && (!user || !profile?.isAdmin)) {
      router.replace("/");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    async function loadStats() {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin?action=stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    }
    if (profile?.isAdmin) loadStats();
  }, [profile, getToken]);

  if (loading || !profile?.isAdmin) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} id="admin-sidebar">
        <div style={{ marginBottom: 8, padding: "0 12px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>🛡️ Admin</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Panel de control</div>
        </div>

        <div className="admin-sidebar-title">Menú</div>

        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`admin-nav-item ${pathname === item.href ? "active" : ""}`}
            id={item.id}
            onClick={() => setSidebarOpen(false)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.badgeKey && stats[item.badgeKey] > 0 && (
              <span className="admin-nav-badge">{stats[item.badgeKey]}</span>
            )}
          </Link>
        ))}

        <div className="admin-sidebar-title" style={{ marginTop: 24 }}>Acciones</div>
        <Link href="/" className="admin-nav-item" id="admin-nav-site" onClick={() => setSidebarOpen(false)}>
          <span>🌐</span>
          <span>Ver sitio</span>
        </Link>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Mobile header */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}
          className="admin-mobile-header"
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSidebarOpen(true)}
            id="admin-sidebar-toggle"
            style={{ display: "none" }}
          >
            ☰
          </button>
        </div>

        {children}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .admin-mobile-header button { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
