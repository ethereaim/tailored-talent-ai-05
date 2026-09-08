import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { importDocuments } from "@/lib/vault-import.functions";
import type { VaultImportData } from "@/lib/cv-types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = Record<string, string>;
type Item = { id: string; picked: boolean; values: Row; source: string };
type Groups = {
  work_experiences: Item[];
  educations: Item[];
  skills: Item[];
  credentials: Item[];
};

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

const FIELDS: Record<keyof Groups, { key: string; label: string; area?: boolean }[]> = {
  work_experiences: [
    { key: "company", label: "Perusahaan" },
    { key: "position", label: "Posisi" },
    { key: "start_date", label: "Mulai" },
    { key: "end_date", label: "Selesai" },
    { key: "description", label: "Deskripsi", area: true },
    { key: "achievements", label: "Pencapaian", area: true },
  ],
  educations: [
    { key: "institution", label: "Institusi" },
    { key: "degree", label: "Jenjang" },
    { key: "field", label: "Jurusan" },
    { key: "start_year", label: "Tahun mulai" },
    { key: "end_year", label: "Tahun selesai" },
    { key: "gpa", label: "IPK" },
    { key: "activities", label: "Kegiatan", area: true },
  ],
  skills: [
    { key: "name", label: "Nama skill" },
    { key: "category", label: "Kategori" },
    { key: "level", label: "Level" },
  ],
  credentials: [
    { key: "kind", label: "Jenis" },
    { key: "name", label: "Nama" },
    { key: "description", label: "Deskripsi", area: true },
    { key: "year", label: "Tahun" },
    { key: "link", label: "Tautan" },
  ],
};

const GROUP_TITLES: Record<keyof Groups, string> = {
  work_experiences: "Pengalaman kerja",
  educations: "Pendidikan",
  skills: "Skills",
  credentials: "Sertifikasi & Proyek",
};

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
    reader.readAsDataURL(file);
  });

let seq = 0;
const nextId = () => `imp-${++seq}`;

export function VaultImport({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const runImport = useServerFn(importDocuments);

  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [groups, setGroups] = useState<Groups | null>(null);
  const [profile, setProfile] = useState<Row | null>(null);
  const [profilePicked, setProfilePicked] = useState(true);
  const [overwriteProfile, setOverwriteProfile] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [];
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name} lebih dari 10 MB.`);
        continue;
      }
      if (!/^(application\/pdf|image\/)/.test(f.type)) {
        toast.error(`${f.name} bukan PDF atau gambar.`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
  };

  const read = useMutation({
    mutationFn: async () => {
      const payload = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          mime: f.type,
          dataUrl: await readFile(f),
        })),
      );
      return runImport({ data: { files: payload } });
    },
    onSuccess: (results) => {
      const next: Groups = { work_experiences: [], educations: [], skills: [], credentials: [] };
      let prof: Row | null = null;

      for (const r of results) {
        if (!r.ok) {
          toast.error(`${r.file}: ${r.error}`);
          continue;
        }
        const d = r.data as VaultImportData;
        if (!prof && d.profile && Object.values(d.profile).some(Boolean)) {
          prof = { ...d.profile } as Row;
        }
        (Object.keys(next) as (keyof Groups)[]).forEach((key) => {
          for (const row of d[key] as unknown as Row[]) {
            const hasContent = Object.values(row).some((v) => v && v.trim());
            if (!hasContent) continue;
            next[key].push({ id: nextId(), picked: true, values: { ...row }, source: r.file });
          }
        });
      }

      const total = Object.values(next).reduce((a, g) => a + g.length, 0);
      setGroups(next);
      setProfile(prof);
      setProfilePicked(!!prof);
      if (!total && !prof) toast.error("Tidak ada data yang terbaca dari berkas tersebut.");
      else toast.success(`${total} usulan data siap diperiksa.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!groups) return;
      const tables: (keyof Groups)[] = ["work_experiences", "educations", "skills", "credentials"];
      let saved = 0;

      if (profile && profilePicked) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        const current = (existing ?? {}) as Row;
        const merged: Row = {};
        for (const key of Object.keys(profile)) {
          const incoming = profile[key] ?? "";
          const old = current[key] ?? "";
          merged[key] = overwriteProfile ? incoming || old : old || incoming;
        }
        const { error } = await supabase.from("profiles").upsert({ id: userId, ...merged } as never);
        if (error) throw error;
        saved += 1;
      }

      for (const table of tables) {
        const rows = groups[table]
          .filter((i) => i.picked)
          .map((i) => ({ ...i.values, user_id: userId }));
        if (!rows.length) continue;
        const { error } = await supabase.from(table as "work_experiences").insert(rows as never);
        if (error) throw error;
        saved += rows.length;
      }
      return saved;
    },
    onSuccess: (saved) => {
      ["profile", "work_experiences", "educations", "skills", "credentials"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k, userId] }),
      );
      toast.success(`${saved ?? 0} data tersimpan ke brankas.`);
      setGroups(null);
      setProfile(null);
      setFiles([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = (group: keyof Groups, id: string, patch: Partial<Item>) =>
    setGroups((g) =>
      g
        ? { ...g, [group]: g[group].map((i) => (i.id === id ? { ...i, ...patch } : i)) }
        : g,
    );

  const totalPicked =
    (groups
      ? Object.values(groups).reduce((a, g) => a + g.filter((i) => i.picked).length, 0)
      : 0) + (profile && profilePicked ? 1 : 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Impor otomatis dari berkas</CardTitle>
          <CardDescription>
            Unggah CV lama, ijazah, sertifikat, atau fotonya. Sistem membaca isinya dan hanya menyalin
            yang benar-benar tertulis — Anda periksa dulu sebelum disimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Seret berkas ke sini atau klik untuk memilih</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG · maks. 10 MB per berkas · maks. 10 berkas</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, idx) => (
                <li
                  key={`${f.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={() => read.mutate()} disabled={!files.length || read.isPending}>
            {read.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Membaca berkas…
              </>
            ) : (
              "Baca semua berkas"
            )}
          </Button>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Checkbox
              checked={profilePicked}
              onCheckedChange={(v) => setProfilePicked(v === true)}
              aria-label="Pakai data pribadi hasil bacaan"
            />
            <div>
              <CardTitle className="text-lg">Data pribadi</CardTitle>
              <CardDescription>Kolom yang sudah terisi di brankas tidak ditimpa, kecuali Anda memilih timpa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.keys(profile)
                .filter((k) => k !== "summary")
                .map((k) => (
                  <div key={k} className="space-y-2">
                    <Label htmlFor={`imp-${k}`}>{k.replace(/_/g, " ")}</Label>
                    <Input
                      id={`imp-${k}`}
                      value={profile[k] ?? ""}
                      onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}
                    />
                  </div>
                ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp-summary">Ringkasan</Label>
              <Textarea
                id="imp-summary"
                rows={3}
                value={profile["summary"] ?? ""}
                onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={overwriteProfile}
                onCheckedChange={(v) => setOverwriteProfile(v === true)}
              />
              Timpa data pribadi yang sudah ada
            </label>
          </CardContent>
        </Card>
      )}

      {groups &&
        (Object.keys(groups) as (keyof Groups)[]).map((group) =>
          groups[group].length ? (
            <div key={group} className="space-y-3">
              <h3 className="text-lg font-medium">{GROUP_TITLES[group]}</h3>
              {groups[group].map((item) => (
                <Card key={item.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.picked}
                        onCheckedChange={(v) => updateItem(group, item.id, { picked: v === true })}
                        aria-label="Pilih data ini"
                      />
                      <span className="text-xs text-muted-foreground">dari {item.source}</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {FIELDS[group].map((f) => (
                        <div
                          key={f.key}
                          className={f.area ? "space-y-2 sm:col-span-2" : "space-y-2"}
                        >
                          <Label htmlFor={`${item.id}-${f.key}`}>{f.label}</Label>
                          {f.area ? (
                            <Textarea
                              id={`${item.id}-${f.key}`}
                              rows={3}
                              value={item.values[f.key] ?? ""}
                              onChange={(e) =>
                                updateItem(group, item.id, {
                                  values: { ...item.values, [f.key]: e.target.value },
                                })
                              }
                            />
                          ) : (
                            <Input
                              id={`${item.id}-${f.key}`}
                              value={item.values[f.key] ?? ""}
                              onChange={(e) =>
                                updateItem(group, item.id, {
                                  values: { ...item.values, [f.key]: e.target.value },
                                })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null,
        )}

      {(groups || profile) && (
        <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border bg-card p-4">
          <Button onClick={() => save.mutate()} disabled={!totalPicked || save.isPending}>
            {save.isPending ? "Menyimpan…" : `Simpan ${totalPicked} data ke brankas`}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setGroups(null);
              setProfile(null);
            }}
          >
            Batalkan
          </Button>
        </div>
      )}
    </div>
  );
}
