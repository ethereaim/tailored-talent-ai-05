import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { VaultImport } from "@/components/vault-import";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Brankas Data Karier | TailorCV" },
      {
        name: "description",
        content: "Simpan profil, pengalaman kerja, pendidikan, skill, sertifikasi, dan proyek Anda di satu tempat.",
      },
      { property: "og:title", content: "Brankas Data Karier | TailorCV" },
      { property: "og:description", content: "Satu tempat untuk seluruh riwayat karier Anda." },
    ],
  }),
  component: VaultPage,
});

type Row = Record<string, string>;

function VaultPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const list = (table: string) =>
    useQuery({
      queryKey: [table, userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from(table as "work_experiences")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data ?? []) as unknown as Row[];
      },
    });

  const work = list("work_experiences");
  const edu = list("educations");
  const skills = list("skills");
  const creds = list("credentials");

  const remove = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase
        .from(table as "work_experiences")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return table;
    },
    onSuccess: (table) => {
      qc.invalidateQueries({ queryKey: [table, userId] });
      toast.success("Data dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: async ({ table, values }: { table: string; values: Row }) => {
      const { error } = await supabase
        .from(table as "work_experiences")
        .insert({ ...values, user_id: userId } as never);
      if (error) throw error;
      return table;
    },
    onSuccess: (table) => {
      qc.invalidateQueries({ queryKey: [table, userId] });
      toast.success("Data ditambahkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Brankas Data</h1>
        <p className="mt-1 text-muted-foreground">
          Isi selengkap mungkin. Semua CV yang dihasilkan hanya boleh memakai fakta dari halaman ini.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="work">Pengalaman</TabsTrigger>
          <TabsTrigger value="edu">Pendidikan</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="creds">Sertifikasi & Proyek</TabsTrigger>
          <TabsTrigger value="import">Impor Otomatis</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-6">
          <VaultImport userId={userId} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm userId={userId} />
        </TabsContent>

        <TabsContent value="work" className="mt-6 space-y-4">
          <EntryForm
            title="Tambah pengalaman kerja"
            fields={[
              { key: "company", label: "Perusahaan" },
              { key: "position", label: "Posisi" },
              { key: "start_date", label: "Mulai (mis. Jan 2022)" },
              { key: "end_date", label: "Selesai (atau 'Sekarang')" },
              { key: "description", label: "Deskripsi tugas", area: true },
              { key: "achievements", label: "Poin pencapaian (satu per baris)", area: true },
            ]}
            onSubmit={(values) => add.mutate({ table: "work_experiences", values })}
          />
          <EntryList
            rows={work.data ?? []}
            render={(r) => ({
              title: `${r["position"]} — ${r["company"]}`,
              subtitle: `${r["start_date"]} – ${r["end_date"]}`,
              body: [r["description"], r["achievements"]].filter(Boolean).join("\n"),
            })}
            onDelete={(id) => remove.mutate({ table: "work_experiences", id })}
          />
        </TabsContent>

        <TabsContent value="edu" className="mt-6 space-y-4">
          <EntryForm
            title="Tambah pendidikan"
            fields={[
              { key: "institution", label: "Institusi" },
              { key: "degree", label: "Jenjang (mis. S1)" },
              { key: "field", label: "Jurusan" },
              { key: "start_year", label: "Tahun mulai" },
              { key: "end_year", label: "Tahun selesai" },
              { key: "gpa", label: "IPK" },
              { key: "activities", label: "Kegiatan / organisasi", area: true },
            ]}
            onSubmit={(values) => add.mutate({ table: "educations", values })}
          />
          <EntryList
            rows={edu.data ?? []}
            render={(r) => ({
              title: `${r["degree"]} ${r["field"]} — ${r["institution"]}`,
              subtitle: `${r["start_year"]} – ${r["end_year"]}${r["gpa"] ? ` · IPK ${r["gpa"]}` : ""}`,
              body: r["activities"] ?? "",
            })}
            onDelete={(id) => remove.mutate({ table: "educations", id })}
          />
        </TabsContent>

        <TabsContent value="skills" className="mt-6 space-y-4">
          <EntryForm
            title="Tambah skill"
            fields={[
              { key: "name", label: "Nama skill" },
              { key: "category", label: "Kategori (hard / soft)", placeholder: "hard" },
              { key: "level", label: "Level (mis. Mahir)" },
            ]}
            onSubmit={(values) => add.mutate({ table: "skills", values })}
          />
          <div className="flex flex-wrap gap-2">
            {(skills.data ?? []).map((s) => (
              <Badge key={s["id"]} variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
                {s["name"]}
                {s["level"] ? <span className="text-muted-foreground">· {s["level"]}</span> : null}
                <button
                  onClick={() => remove.mutate({ table: "skills", id: s["id"] as string })}
                  aria-label={`Hapus ${s["name"]}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="creds" className="mt-6 space-y-4">
          <EntryForm
            title="Tambah sertifikasi atau proyek"
            fields={[
              { key: "kind", label: "Jenis (certification / project)", placeholder: "certification" },
              { key: "name", label: "Nama" },
              { key: "description", label: "Deskripsi singkat", area: true },
              { key: "year", label: "Tahun" },
              { key: "link", label: "Tautan (opsional)" },
            ]}
            onSubmit={(values) => add.mutate({ table: "credentials", values })}
          />
          <EntryList
            rows={creds.data ?? []}
            render={(r) => ({
              title: r["name"] ?? "",
              subtitle: `${r["kind"]}${r["year"] ? ` · ${r["year"]}` : ""}`,
              body: r["description"] ?? "",
            })}
            onDelete={(id) => remove.mutate({ table: "credentials", id })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Row>({});
  useEffect(() => {
    if (data) setForm(data as unknown as Row);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: form["full_name"] ?? "",
        email: form["email"] ?? "",
        phone: form["phone"] ?? "",
        location: form["location"] ?? "",
        linkedin_url: form["linkedin_url"] ?? "",
        portfolio_url: form["portfolio_url"] ?? "",
        summary: form["summary"] ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Profil tersimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (key: string, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data pribadi</CardTitle>
        <CardDescription>Dipakai di bagian kepala CV Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("full_name", "Nama lengkap")}
          {field("email", "Email")}
          {field("phone", "Nomor telepon")}
          {field("location", "Lokasi")}
          {field("linkedin_url", "LinkedIn")}
          {field("portfolio_url", "Portofolio")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Ringkasan profil</Label>
          <Textarea
            id="summary"
            rows={4}
            value={form["summary"] ?? ""}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Menyimpan…" : "Simpan profil"}
        </Button>
      </CardContent>
    </Card>
  );
}

type Field = { key: string; label: string; area?: boolean; placeholder?: string };

function EntryForm({
  title,
  fields,
  onSubmit,
}: {
  title: string;
  fields: Field[];
  onSubmit: (values: Row) => void;
}) {
  const [values, setValues] = useState<Row>({});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.area ? "space-y-2 sm:col-span-2" : "space-y-2"}>
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.area ? (
                <Textarea
                  id={f.key}
                  rows={3}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  id={f.key}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <Button
          onClick={() => {
            onSubmit(values);
            setValues({});
          }}
        >
          Tambahkan
        </Button>
      </CardContent>
    </Card>
  );
}

function EntryList({
  rows,
  render,
  onDelete,
}: {
  rows: Row[];
  render: (r: Row) => { title: string; subtitle: string; body: string };
  onDelete: (id: string) => void;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Belum ada data.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const view = render(r);
        return (
          <Card key={r["id"]}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{view.title}</p>
                <p className="text-sm text-muted-foreground">{view.subtitle}</p>
                {view.body ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{view.body}</p>
                ) : null}
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDelete(r["id"] as string)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
