"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

export default function VerifyPage() {
  const { user, refreshProfile, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleResend() {
    if (!user || !user.email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
      if (error) throw error;
      showToast("Email de verificación reenviado ✉️", "success");
    } catch {
      showToast("No se pudo reenviar. Espera un momento.", "error");
    } finally {
      setResending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    try {
      // Force refresh session from server to get updated email_confirmed_at
      const { data: { session }, error } = await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Also check our own users table just in case they were manually verified
      const { data: userDoc } = await supabase.from("users").select("isVerified").eq("email", user?.email).maybeSingle();

      if (user?.email_confirmed_at || userDoc?.isVerified) {
        await refreshProfile();
        showToast("¡Email verificado! Ya puedes subir scans 🎉", "success");
        router.push("/");
      } else {
        showToast("Aún no verificado. Revisa tu bandeja de entrada.", "info");
      }
    } catch(err) {
      console.error(err);
      showToast("Error al verificar. Intenta de nuevo.", "error");
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="verify-screen">
      <div className="verify-card animate-slide-up">
        <div className="verify-icon">✉️</div>
        <h1 className="verify-title">Verifica tu correo</h1>
        <p className="verify-desc">
          Enviamos un email de verificación a:
        </p>
        <div className="verify-email-highlight">
          {user?.email || "tu email"}
        </div>
        <p className="verify-desc" style={{ marginTop: 16 }}>
          Abre el correo y haz clic en el enlace para verificar tu cuenta.
          Después de verificar, podrás subir tus scans.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleCheck}
            disabled={checking}
            id="verify-check-btn"
          >
            {checking ? (
              <><span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Verificando...</>
            ) : "✅ Ya verifiqué mi correo"}
          </button>

          <button
            className="btn btn-secondary btn-lg w-full"
            onClick={handleResend}
            disabled={resending}
            id="verify-resend-btn"
          >
            {resending ? "Reenviando..." : "🔄 Reenviar email"}
          </button>

          <button
            className="btn btn-ghost w-full"
            onClick={handleLogout}
            id="verify-logout-btn"
            style={{ color: "var(--text-muted)", fontSize: 13 }}
          >
            Cerrar sesión
          </button>
        </div>

        <div style={{ marginTop: 20, padding: 14, background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius-md)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 13, color: "var(--warning)" }}>
          💡 Revisa también tu carpeta de spam si no encuentras el correo.
        </div>
      </div>
    </div>
  );
}
