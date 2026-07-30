"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    if (password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    setLoading(true);
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .ilike("displayName", displayName.trim())
        .maybeSingle();

      if (existingUser) {
        showToast("Ese nombre de usuario ya está en uso", "error");
        setLoading(false);
        return;
      }

      await register(email, password, displayName.trim());
      router.push("/");
    } catch (err: any) {
      const msg = err.message?.includes("already") || err.code === "auth/email-already-in-use"
        ? "Este correo ya está registrado"
        : err.message?.includes("weak") || err.code === "auth/weak-password"
        ? "La contraseña es muy débil"
        : "Error al crear cuenta";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        <div className="auth-logo">
          <div className="auth-logo-title gradient-text">📚 MangaVerse</div>
          <div className="auth-logo-sub">Únete a la comunidad</div>
        </div>

        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Gratis para siempre · Sin anuncios</p>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Nombre de usuario</label>
            <input
              id="reg-name"
              type="text"
              className="form-input"
              placeholder="TuNombreAqui"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={30}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">Confirmar contraseña</label>
            <input
              id="reg-confirm"
              type="password"
              className="form-input"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Al registrarte aceptas nuestros términos.
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            id="register-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <><span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Creando cuenta...</>
            ) : "Crear cuenta gratis"}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" id="register-login-link">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
