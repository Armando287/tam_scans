"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  mangas: number;
  chapters: number;
  users: number;
  pending: number;
}

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin?action=stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
      setLoading(false);
    }
    load();
  }, [getToken]);

  const statCards = [
    { icon: "📚", label: "Mangas", value: stats?.mangas ?? 0, color: "#7c3aed" },
    { icon: "📋", label: "Capítulos", value: stats?.chapters ?? 0, color: "#06b6d4" },
    { icon: "👥", label: "Usuarios", value: stats?.users ?? 0, color: "#10b981" },
    { icon: "⏳", label: "Pendientes", value: stats?.pending ?? 0, color: "#f59e0b" },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="admin-page-title" id="admin-dashboard-title">
        <span>📊</span> Dashboard
      </h1>

      {/* Stats */}
      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card" id={`stat-card-${card.label.toLowerCase()}`}>
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-value" style={{ color: card.color }}>
              {loading ? <span className="skeleton" style={{ height: 32, width: 60, display: "block" }} /> : card.value}
            </div>
            <div className="stat-card-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Acciones rápidas</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin/chapters" className="btn btn-primary btn-sm" id="admin-quick-chapters">
            ⏳ Revisar pendientes {stats?.pending ? `(${stats.pending})` : ""}
          </a>
          <a href="/admin/mangas" className="btn btn-secondary btn-sm" id="admin-quick-new-manga">
            ➕ Crear manga
          </a>
          <a href="/admin/users" className="btn btn-secondary btn-sm" id="admin-quick-users">
            👥 Gestionar usuarios
          </a>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "var(--radius-lg)", padding: 20, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text-primary)" }}>ℹ️ Guía rápida</strong>
        <ul style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Los capítulos subidos por usuarios quedan en estado <strong>Pendiente</strong> hasta que los apruebes.</li>
          <li>Para crear un manga nuevo, ve a la sección <strong>Mangas</strong> y usa el botón Crear.</li>
          <li>Puedes banear usuarios desde la sección <strong>Usuarios</strong>.</li>
          <li>Para dar acceso de admin a alguien, busca al usuario y selecciona "Hacer admin".</li>
        </ul>
      </div>
    </div>
  );
}
