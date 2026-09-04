import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadCvPdf } from "@/lib/cv-pdf";
import type { TailoredCv } from "@/lib/cv-types";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Riwayat CV | TailorCV" },
      { name: "description", content: "Lihat dan unduh ulang semua CV yang pernah Anda hasilkan." },
      { property: "og:title", content: "Riwayat CV | TailorCV" },
      { property: "og:description", content: "Semua CV yang pernah dibuat, siap diunduh ulang." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["cvs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_cvs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Riwayat CV</h1>
      {!data?.length ? (
        <p className="text-muted-foreground">Belum ada CV yang dibuat.</p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">
                    {row.job_title || "Tanpa judul"}
                    {row.job_company ? ` · ${row.job_company}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Match {row.match_score}% · {new Date(row.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadCvPdf(
                      row.cv as unknown as TailoredCv,
                      `cv-${(row.job_title || "loker").toLowerCase().replace(/\s+/g, "-")}.pdf`,
                    )
                  }
                >
                  Unduh PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
