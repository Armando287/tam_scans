"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function LoginPage() {
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast("¡Bienvenido de vuelta!", "success");
      router.push("/");
    } catch (err: any) {
      const msg = err.code === "auth/invalid-credential"
        ? "Email o contraseña incorrectos"
        : err.code === "auth/too-many-requests"
        ? "Demasiados intentos. Intenta más tarde."
        : "Error al iniciar sesión";
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
          <div className="auth-logo-sub">La comunidad de manga</div>
        </div>

        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-subtitle">Ingresa a tu cuenta para continuar</p>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Contraseña</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            id="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <><span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Ingresando...</>
            ) : "Ingresar"}
          </button>
        </form>

        <div className="auth-footer">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/register" id="login-register-link">Regístrate gratis</Link>
        </div>
      </div>
    </div>
  );
}
