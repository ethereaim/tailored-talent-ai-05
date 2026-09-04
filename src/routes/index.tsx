import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TailorCV — CV ATS yang Disesuaikan dengan Tiap Lowongan" },
      {
        name: "description",
        content:
          "Simpan riwayat karier sekali, lalu hasilkan CV ATS-friendly yang disesuaikan dengan lowongan dari teks, link, atau poster dalam waktu kurang dari 2 menit.",
      },
      { property: "og:title", content: "TailorCV — CV ATS untuk Tiap Lowongan" },
      {
        property: "og:description",
        content: "Buat CV yang relevan dengan tiap lowongan dalam hitungan menit, tanpa mengarang data.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { n: "01", t: "Isi Brankas Data", d: "Pengalaman, pendidikan, skill, sertifikasi — cukup sekali." },
  { n: "02", t: "Masukkan Loker", d: "Tempel teks, tempel link, atau unggah poster lowongan." },
  { n: "03", t: "Lihat Match Score", d: "Skor kecocokan plus daftar skill yang belum terpenuhi." },
  { n: "04", t: "Unduh PDF ATS", d: "Teks bisa diblok, font standar, layout bersih untuk mesin seleksi." },
];

function Landing() {
  return (
    <div className="surface-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-lg font-semibold">
          Tailor<span className="text-ember">CV</span>
        </span>
        <Link to="/auth">
          <Button variant="secondary" size="sm">
            Masuk
          </Button>
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-16 text-center">
        <p className="mb-5 inline-block rounded-full border border-border bg-card px-4 py-1.5 text-xs tracking-wide text-muted-foreground">
          Dari 45 menit jadi kurang dari 2 menit
        </p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
          CV yang <span className="text-ember">menyesuaikan diri</span> dengan tiap lowongan
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Simpan seluruh riwayat karier Anda satu kali. Setiap kali melamar, tempel deskripsi lowongan —
          teks, link, atau foto poster — dan dapatkan CV ATS-friendly yang menonjolkan pengalaman paling
          relevan. Tanpa mengarang fakta.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="shadow-glow">
              Mulai gratis
            </Button>
          </Link>
          <Link to="/generate">
            <Button size="lg" variant="outline">
              Coba generate CV
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <Card key={s.n} className="shadow-panel">
            <CardContent className="p-6">
              <span className="font-display text-sm text-primary">{s.n}</span>
              <h2 className="mt-3 text-lg font-semibold">{s.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
