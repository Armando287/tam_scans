"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
    setMenuOpen(false);
  }

  const isReader = pathname?.includes("/read/");

  return (
    <nav className="navbar" role="navigation" aria-label="Navegación principal">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo" id="navbar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-primary)" }}>
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          MangaVerse
        </Link>

        {/* Search (hidden in reader mode) */}
        {!isReader && (
          <form className="navbar-search" onSubmit={handleSearch} role="search">
            <span className="navbar-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Buscar manga..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ minHeight: "38px", padding: "6px 16px 6px 38px" }}
              aria-label="Buscar manga"
              id="navbar-search-input"
            />
          </form>
        )}

        {/* Actions */}
        <div className="navbar-actions">
          {!isReader && user && profile?.emailVerified && (
            <Link
              href="/upload"
              className="btn btn-primary btn-sm"
              id="navbar-upload-btn"
              style={{ display: "flex" }}
            >
              <span>⬆️</span>
              <span className="hide-xs">Subir</span>
            </Link>
          )}

          {user ? (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="navbar-user-avatar"
                onClick={() => setMenuOpen(!menuOpen)}
                id="navbar-user-menu-btn"
                aria-label="Menú de usuario"
                aria-expanded={menuOpen}
              >
                {(profile?.displayName || user.displayName || user.email || "U")[0].toUpperCase()}
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    padding: "8px",
                    minWidth: "200px",
                    boxShadow: "var(--shadow-card)",
                    zIndex: 1100,
                    animation: "fade-in 0.15s ease",
                  }}
                >
                  <div style={{ padding: "8px 12px 12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "8px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {profile?.displayName || user.displayName || "Usuario"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {user.email}
                    </div>
                    {!profile?.emailVerified && (
                      <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 4 }}>
                        ⚠️ Email no verificado
                      </div>
                    )}
                  </div>

                  {profile?.isAdmin && (
                    <Link
                      href="/admin"
                      className="admin-nav-item"
                      onClick={() => setMenuOpen(false)}
                      id="navbar-admin-link"
                    >
                      🛡️ Panel Admin
                    </Link>
                  )}

                  <button
                    className="admin-nav-item"
                    onClick={handleLogout}
                    id="navbar-logout-btn"
                    style={{ color: "var(--danger)", width: "100%" }}
                  >
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-ghost btn-sm" id="navbar-login-btn">
                Ingresar
              </Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm" id="navbar-register-btn">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .hide-xs { display: none; }
        @media (min-width: 400px) { .hide-xs { display: inline; } }
      `}</style>
    </nav>
  );
}
