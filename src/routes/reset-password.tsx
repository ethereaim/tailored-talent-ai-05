import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Atur Ulang Kata Sandi | Tailor CV AI" },
      { name: "description", content: "Buat kata sandi baru untuk akun Tailor CV AI Anda." },
      { property: "og:title", content: "Atur Ulang Kata Sandi | Tailor CV AI" },
      { property: "og:description", content: "Buat kata sandi baru untuk akun Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Kata sandi berhasil diperbarui.");
      navigate({ to: "/vault" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui kata sandi";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/auth" className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Kembali ke halaman masuk
        </Link>
        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Kata sandi baru</CardTitle>
            <CardDescription>
              Masukkan kata sandi baru Anda. Setelah tersimpan, Anda langsung masuk ke brankas data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {!ready && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Buka halaman ini lewat tautan yang kami kirim ke email Anda agar kata sandi bisa diganti.
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi baru</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Ulangi kata sandi</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  minLength={8}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !ready}>
                {busy ? "Menyimpan…" : "Simpan kata sandi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
