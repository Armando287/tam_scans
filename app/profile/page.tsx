"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { updateUserProfile } from "@/lib/firestore";
import Image from "next/image";

export default function ProfilePage() {
  const { user, profile, refreshProfile, getToken } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    router.replace("/auth/login");
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.uid) return;
    
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, { displayName });
      await refreshProfile();
      showToast("Perfil actualizado correctamente", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al guardar perfil", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen es demasiado grande (Máx 5MB)", "error");
      return;
    }

    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      await updateUserProfile(profile.uid, { avatarUrl: data.url });
      await refreshProfile();
      showToast("Foto de perfil actualizada", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al subir imagen", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="container" style={{ paddingBottom: 100, paddingTop: "calc(var(--navbar-height) + 20px)" }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Mi Perfil</h1>

      <div style={{ background: "var(--bg-card)", padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
        
        {/* Avatar Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div 
            style={{ 
              width: 120, 
              height: 120, 
              borderRadius: "50%", 
              background: "var(--bg-elevated)",
              overflow: "hidden",
              marginBottom: 16,
              border: "2px solid var(--border-accent)",
              position: "relative"
            }}
          >
            {profile?.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt="Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                👤
              </div>
            )}
            {uploading && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="loading-spinner" />
              </div>
            )}
          </div>
          
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/webp, image/gif" 
            style={{ display: "none" }} 
            ref={fileInputRef}
            onChange={handleAvatarUpload}
          />
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Cambiar foto
          </button>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>JPG, PNG o GIF animado. Máx 5MB.</p>
        </div>

        {/* Info Section */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400, margin: "0 auto" }}>
          <div>
            <label className="form-label">Correo electrónico (No modificable)</label>
            <input type="text" className="form-input" value={profile?.email || ""} disabled style={{ opacity: 0.6 }} />
          </div>

          <div>
            <label className="form-label">Nombre de usuario</label>
            <input 
              type="text" 
              className="form-input" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              required
              minLength={2}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving || displayName === profile?.displayName}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

      </div>
    </div>
  );
}
