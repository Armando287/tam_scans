"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { updateUserProfile } from "@/lib/firestore";
import { getProxyUrl } from "@/lib/image-utils";
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, refreshProfile, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
    else if (user?.displayName) setDisplayName(user.displayName);
  }, [profile, user]);

  if (!user) {
    return (
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">👤</div>
        <div className="empty-state-title">No has iniciado sesión</div>
        <Link href="/auth/login" className="btn btn-primary" style={{ marginTop: 20 }}>Iniciar Sesión</Link>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      await refreshProfile();
      showToast("Nombre actualizado", "success");
    } catch (error) {
      showToast("Error al guardar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen debe pesar menos de 5MB", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.uid);

      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir");
      const data = await res.json();
      
      await updateUserProfile(user.uid, { avatarUrl: data.url });
      await refreshProfile();
      showToast("Avatar actualizado", "success");
    } catch (error) {
      console.error(error);
      showToast("No se pudo actualizar el avatar", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  const handleLogout = async () => {
     await logout();
     router.push("/");
  };

  const avatarSrc = profile?.avatarUrl ? getProxyUrl(profile.avatarUrl) : null;

  return (
    <div className="app-layout-page pb-24">
      <div className="app-header">
        <h1 className="app-title">Mi Perfil</h1>
      </div>

      {/* Avatar Section */}
      <div className="profile-hero">
        <div 
          className="profile-avatar-wrapper"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingAvatar ? (
            <div className="loading-spinner" style={{ width: 30, height: 30 }} />
          ) : avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">
              {(profile?.displayName || user.email || "U")[0].toUpperCase()}
            </div>
          )}
          <div className="profile-avatar-edit-badge">✏️</div>
        </div>
        <h2 className="profile-hero-name">{profile?.displayName || user.displayName || "Usuario"}</h2>
        <p className="profile-hero-email">{user.email}</p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="settings-list-group">
        <div className="settings-list-title">Cuenta</div>
        
        <div className="settings-list-item">
          <div className="settings-list-item-content">
            <label className="settings-label">Nombre de usuario</label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="settings-input"
                placeholder="Tu nombre..."
              />
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleSaveName}
                disabled={loading || displayName === profile?.displayName}
              >
                {loading ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>

        {profile?.isAdmin && (
          <Link href="/admin" className="settings-list-item interactive">
            <span className="settings-icon">🛡️</span>
            <span className="settings-label">Panel de Administración</span>
            <span className="settings-arrow">›</span>
          </Link>
        )}
      </div>

      <div className="settings-list-group">
        <div className="settings-list-title">Actividad</div>
        <Link href="/library" className="settings-list-item interactive">
          <span className="settings-icon">📚</span>
          <span className="settings-label">Mi Biblioteca</span>
          <span className="settings-arrow">›</span>
        </Link>
        <Link href="/upload" className="settings-list-item interactive">
          <span className="settings-icon">⬆️</span>
          <span className="settings-label">Subir Manga</span>
          <span className="settings-arrow">›</span>
        </Link>
      </div>

      <div className="settings-list-group">
        <div className="settings-list-item interactive danger" onClick={handleLogout}>
          <span className="settings-icon">🚪</span>
          <span className="settings-label">Cerrar Sesión</span>
        </div>
      </div>
    </div>
  );
}
