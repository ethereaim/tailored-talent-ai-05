import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { extractJob, tailorCv } from "@/lib/cv.functions";
import { emptyJob, type JobData, type TailorResult, type TailoredCv } from "@/lib/cv-types";
import { downloadCvPdf } from "@/lib/cv-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({
    meta: [
      { title: "Generate CV Tailored | TailorCV" },
      {
        name: "description",
        content: "Tempel teks lowongan, link, atau unggah poster untuk menghasilkan CV ATS yang disesuaikan.",
      },
      { property: "og:title", content: "Generate CV Tailored | TailorCV" },
      { property: "og:description", content: "Dari deskripsi lowongan menjadi CV ATS dalam hitungan menit." },
    ],
  }),
  component: GeneratePage,
});

type Step = "input" | "confirm" | "result";

function GeneratePage() {
  const extract = useServerFn(extractJob);
  const tailor = useServerFn(tailorCv);

  const [step, setStep] = useState<Step>("input");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [job, setJob] = useState<JobData>(emptyJob);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [cv, setCv] = useState<TailoredCv | null>(null);

  const runExtract = async (mode: "text" | "url" | "image") => {
    setBusy(true);
    try {
      const data = await extract({
        data: { mode, text, url, image: image ?? undefined },
      });
      setJob(data);
      setStep("confirm");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membaca lowongan");
    } finally {
      setBusy(false);
    }
  };

  const runTailor = async () => {
    setBusy(true);
    try {
      const res = await tailor({ data: { job } });
      setResult(res);
      setCv(res.cv);
      setStep("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat CV");
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 8 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Generate CV</h1>
        <p className="mt-1 text-muted-foreground">
          Tiga cara memasukkan lowongan: salin teks, tempel link, atau unggah poster.
        </p>
      </div>

      {step === "input" && (
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="text">
              <TabsList>
                <TabsTrigger value="text">Teks</TabsTrigger>
                <TabsTrigger value="url">Link</TabsTrigger>
                <TabsTrigger value="image">Poster</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-5 space-y-4">
                <Textarea
                  rows={12}
                  placeholder="Tempel deskripsi lowongan lengkap di sini…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button onClick={() => runExtract("text")} disabled={busy}>
                  {busy ? "Membaca…" : "Baca lowongan"}
                </Button>
              </TabsContent>

              <TabsContent value="url" className="mt-5 space-y-4">
                <Input
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Sebagian situs loker memblokir pembacaan otomatis. Jika gagal, salin-tempel teksnya.
                </p>
                <Button onClick={() => runExtract("url")} disabled={busy}>
                  {busy ? "Membaca…" : "Baca dari link"}
                </Button>
              </TabsContent>

              <TabsContent value="image" className="mt-5 space-y-4">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFile(file);
                  }}
                />
                {image && (
                  <img src={image} alt="Pratinjau poster lowongan" className="max-h-72 rounded-lg border" />
                )}
                <Button onClick={() => runExtract("image")} disabled={busy || !image}>
                  {busy ? "Membaca poster…" : "Baca poster"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>Konfirmasi kualifikasi</CardTitle>
            <CardDescription>Periksa dan perbaiki hasil pembacaan sebelum CV dibuat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Posisi" value={job.title} onChange={(v) => setJob({ ...job, title: v })} />
              <TextField
                label="Perusahaan"
                value={job.company}
                onChange={(v) => setJob({ ...job, company: v })}
              />
              <TextField
                label="Lokasi"
                value={job.location}
                onChange={(v) => setJob({ ...job, location: v })}
              />
              <TextField
                label="Tipe pekerjaan"
                value={job.employment_type}
                onChange={(v) => setJob({ ...job, employment_type: v })}
              />
            </div>
            <ListField
              label="Tanggung jawab"
              value={job.responsibilities}
              onChange={(v) => setJob({ ...job, responsibilities: v })}
            />
            <ListField
              label="Kualifikasi"
              value={job.requirements}
              onChange={(v) => setJob({ ...job, requirements: v })}
            />
            <ListField
              label="Skill yang diminta"
              value={job.skills}
              onChange={(v) => setJob({ ...job, skills: v })}
            />
            <div className="flex gap-3">
              <Button onClick={runTailor} disabled={busy}>
                {busy ? "Menyusun CV…" : "Buat CV tailored"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("input")}>
                Kembali
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && cv && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Match Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-display text-4xl text-ember">{result.match_score}%</p>
                <Progress value={result.match_score} />
                {result.missing_skills.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Belum terpenuhi</p>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result.highlights.length > 0 && (
                  <div>
                    <p className="mb-2 mt-4 text-sm font-medium">Yang ditonjolkan</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {result.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button className="w-full shadow-glow" onClick={() => downloadCvPdf(cv)}>
              Unduh PDF ATS
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("input")}>
              Buat untuk loker lain
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pratinjau CV</CardTitle>
              <CardDescription>Teks bisa diedit langsung sebelum diunduh.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Ringkasan</Label>
                <Textarea
                  rows={4}
                  value={cv.summary}
                  onChange={(e) => setCv({ ...cv, summary: e.target.value })}
                />
              </div>
              {cv.experiences.map((exp, i) => (
                <div key={`${exp.company}-${i}`} className="space-y-2 rounded-lg border p-4">
                  <p className="font-medium">
                    {exp.position} — {exp.company}
                  </p>
                  <p className="text-sm text-muted-foreground">{exp.period}</p>
                  <Textarea
                    rows={Math.max(3, exp.bullets.length + 1)}
                    value={exp.bullets.join("\n")}
                    onChange={(e) => {
                      const next = [...cv.experiences];
                      next[i] = { ...exp, bullets: e.target.value.split("\n").filter(Boolean) };
                      setCv({ ...cv, experiences: next });
                    }}
                  />
                </div>
              ))}
              <div>
                <Label>Skills</Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[...cv.hard_skills, ...cv.soft_skills].join(" · ")}
                </p>
              </div>
              {cv.education.length > 0 && (
                <div>
                  <Label>Pendidikan</Label>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {cv.education.map((e, i) => (
                      <li key={i}>
                        {e.degree} — {e.institution} ({e.period})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label} (satu per baris)</Label>
      <Textarea
        rows={Math.min(10, Math.max(3, value.length + 1))}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
      />
    </div>
  );
}
