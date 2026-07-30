"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface User {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isVerified: boolean;
  isBanned: boolean;
  uploadCount: number;
  createdAt: any;
}

function formatDate(ts: any) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsers() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin?action=users", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function doAction(action: string, userId: string, label: string) {
    setActing(userId);
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: userId }),
    });
    if (res.ok) { showToast(label, "success"); await load(); }
    else showToast("Error al ejecutar acción", "error");
    setActing(null);
  }

  const filtered = users.filter((u) =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 className="admin-page-title" style={{ margin: 0 }} id="admin-users-title">👥 Usuarios</h1>
        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input
            id="admin-users-search"
            type="search"
            className="admin-search-input"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-page" style={{ padding: 40 }}><div className="loading-spinner" /></div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table" id="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Verificado</th>
                <th>Uploads</th>
                <th>Registro</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr key={u.id} id={`user-row-${u.id}`}>
                  <td style={{ fontWeight: 600 }}>{u.displayName || "—"}</td>
                  <td style={{ fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</td>
                  <td>{u.isVerified ? "✅" : "⚠️"}</td>
                  <td>{u.uploadCount || 0}</td>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(u.createdAt)}</td>
                  <td>
                    {u.isAdmin
                      ? <span className="badge badge-published">Admin</span>
                      : <span className="badge badge-genre">Usuario</span>}
                  </td>
                  <td>
                    {u.isBanned
                      ? <span className="badge badge-rejected">Baneado</span>
                      : <span className="badge badge-published">Activo</span>}
                  </td>
                  <td>
                    <div className="data-table-actions">
                      {!u.isAdmin && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { if(confirm("¿Hacer admin a este usuario?")) doAction("make-admin", u.id, "Usuario promovido a admin") }}
                          disabled={acting === u.id}
                          id={`user-make-admin-${u.id}`}
                        >
                          🛡️ Admin
                        </button>
                      )}
                      {u.isBanned ? (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => doAction("unban-user", u.id, "Usuario desbaneado ✅")}
                          disabled={acting === u.id}
                          id={`user-unban-${u.id}`}
                        >
                          Desbanear
                        </button>
                      ) : (
                        !u.isAdmin && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { if(confirm("¿Banear a este usuario?")) doAction("ban-user", u.id, "Usuario baneado") }}
                            disabled={acting === u.id}
                            id={`user-ban-${u.id}`}
                          >
                            Banear
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length > 0 && (
            <div className="pagination">
              <div className="pagination-info">
                Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
              </div>
              <div className="pagination-controls">
                <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
                  Anterior
                </button>
                <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(c => c + 1)}>
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="empty-state" style={{ border: "none", margin: 0 }}>
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">{search ? "Sin resultados" : "Sin usuarios registrados"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
