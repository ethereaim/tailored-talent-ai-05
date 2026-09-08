import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VaultImportData } from "./cv-types";

const FileInput = z.object({
  name: z.string(),
  mime: z.string(),
  dataUrl: z.string(),
});

const ImportInput = z.object({
  files: z.array(FileInput).min(1).max(10),
});

const IMPORT_SYSTEM = `You extract career data from a raw document (CV, diploma, certificate, transcript, portfolio, or a photo of one).
ONLY copy facts literally present in the document. NEVER invent, guess, or complete missing values — leave "" or [].
Keep the original language of the document.
Return strict JSON with this exact shape:
{
 "profile": {"full_name": string, "email": string, "phone": string, "location": string, "linkedin_url": string, "portfolio_url": string, "summary": string},
 "work_experiences": [{"company": string, "position": string, "start_date": string, "end_date": string, "description": string, "achievements": string}],
 "educations": [{"institution": string, "degree": string, "field": string, "start_year": string, "end_year": string, "gpa": string, "activities": string}],
 "skills": [{"name": string, "category": "hard"|"soft", "level": string}],
 "credentials": [{"kind": "certification"|"project", "name": string, "description": string, "year": string, "link": string}]
}`;

const s = (v: unknown) => (typeof v === "string" ? v : "");

export const importDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ImportInput.parse(data))
  .handler(async ({ data }) => {
    const { aiJson } = await import("./ai.server");

    const readOne = async (f: z.infer<typeof FileInput>) => {
      const isImage = f.mime.startsWith("image/");
      const block = isImage
        ? { type: "image_url", image_url: { url: f.dataUrl } }
        : { type: "file", file: { filename: f.name, file_data: f.dataUrl } };

      const raw = await aiJson<Record<string, unknown>>([
        { role: "system", content: IMPORT_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Ekstrak seluruh data karier dari dokumen ini sebagai JSON." },
            block,
          ],
        },
      ]);

      const p = (raw["profile"] ?? {}) as Record<string, unknown>;
      const arr = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as Record<string, unknown>[]) : []);

      const parsed: VaultImportData = {
        profile: {
          full_name: s(p["full_name"]),
          email: s(p["email"]),
          phone: s(p["phone"]),
          location: s(p["location"]),
          linkedin_url: s(p["linkedin_url"]),
          portfolio_url: s(p["portfolio_url"]),
          summary: s(p["summary"]),
        },
        work_experiences: arr("work_experiences").map((r) => ({
          company: s(r["company"]),
          position: s(r["position"]),
          start_date: s(r["start_date"]),
          end_date: s(r["end_date"]),
          description: s(r["description"]),
          achievements: s(r["achievements"]),
        })),
        educations: arr("educations").map((r) => ({
          institution: s(r["institution"]),
          degree: s(r["degree"]),
          field: s(r["field"]),
          start_year: s(r["start_year"]),
          end_year: s(r["end_year"]),
          gpa: s(r["gpa"]),
          activities: s(r["activities"]),
        })),
        skills: arr("skills").map((r) => ({
          name: s(r["name"]),
          category: s(r["category"]) === "soft" ? "soft" : "hard",
          level: s(r["level"]),
        })),
        credentials: arr("credentials").map((r) => ({
          kind: s(r["kind"]) === "project" ? "project" : "certification",
          name: s(r["name"]),
          description: s(r["description"]),
          year: s(r["year"]),
          link: s(r["link"]),
        })),
      };

      return parsed;
    };

    const results = await Promise.all(
      data.files.map(async (f) => {
        try {
          return { file: f.name, ok: true as const, data: await readOne(f) };
        } catch (e) {
          return {
            file: f.name,
            ok: false as const,
            error: e instanceof Error ? e.message : "Gagal membaca berkas.",
          };
        }
      }),
    );

    return results;
  });
