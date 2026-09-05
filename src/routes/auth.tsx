import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk | Tailor CV AI" },
      { name: "description", content: "Masuk atau daftar untuk menyimpan brankas data karier dan membuat CV ATS." },
      { property: "og:title", content: "Masuk | Tailor CV AI" },
      { property: "og:description", content: "Masuk untuk membuat CV yang disesuaikan dengan lowongan." },
    ],
  }),
  component: AuthPage,
});

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess"))
    return "Kata sandi terlalu mudah ditebak. Gunakan minimal 8 karakter dengan kombinasi huruf, angka, dan simbol.";
  if (m.includes("invalid login credentials"))
    return "Email atau kata sandi salah. Jika dulu Anda mendaftar lewat Google, masuklah dengan tombol Google.";
  if (m.includes("already registered") || m.includes("user already"))
    return "Email ini sudah terdaftar. Silakan masuk, atau gunakan tombol Google.";
  if (m.includes("email not confirmed"))
    return "Email belum dikonfirmasi. Cek kotak masuk Anda dan klik tautan konfirmasi.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
  if (m.includes("password should be at least"))
    return "Kata sandi minimal 8 karakter.";
  return message;
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    if (session) navigate({ to: "/vault" });
  }, [session, navigate]);

  useEffect(() => {
    setError(null);
    setCheckEmail(false);
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        if (password.length < 8) {
          setError("Kata sandi minimal 8 karakter.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        // Akun sudah ada sebelumnya: Supabase mengembalikan user tanpa identities.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("Email ini sudah terdaftar. Silakan masuk, atau gunakan tombol Google.");
          setMode("login");
          return;
        }
        if (!data.session) {
          setCheckEmail(true);
          toast.success("Cek email Anda untuk mengonfirmasi akun.");
          return;
        }
        toast.success("Akun dibuat. Silakan lanjut isi brankas data.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = friendlyError(err instanceof Error ? err.message : "Gagal memproses");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) {
      setError("Isi email Anda dulu, lalu klik lupa kata sandi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Tautan atur ulang kata sandi sudah dikirim ke email Anda.");
    } catch (err) {
      const msg = friendlyError(err instanceof Error ? err.message : "Gagal mengirim tautan");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Gagal masuk dengan Google. Coba lagi.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/vault" });
  };


  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Kembali ke beranda
        </Link>
        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle className="text-2xl">{mode === "login" ? "Masuk" : "Buat akun"}</CardTitle>
            <CardDescription>
              Simpan riwayat karier sekali, hasilkan CV terpersonalisasi berkali-kali.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {checkEmail && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Kami sudah mengirim tautan konfirmasi ke {email}. Buka email itu untuk mengaktifkan akun.
              </div>
            )}
            <Button variant="secondary" className="w-full" onClick={google} type="button">
              Lanjut dengan Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nama lengkap</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
