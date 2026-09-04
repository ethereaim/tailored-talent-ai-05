import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { JobData, TailorResult, TailoredCv } from "./cv-types";

const ExtractInput = z.object({
  mode: z.enum(["text", "url", "image"]),
  text: z.string().optional(),
  url: z.string().optional(),
  image: z.string().optional(),
});

const EXTRACT_SYSTEM = `You extract structured job requirements from job postings (Indonesian or English).
Return strict JSON with keys: title, company, location, employment_type, responsibilities (string[]), requirements (string[]), skills (string[]), keywords (string[]).
Keep the original language of the posting. Never invent details that are not present; use "" or [] when unknown.`;

export const extractJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ExtractInput.parse(data))
  .handler(async ({ data }): Promise<JobData> => {
    const { aiJson, fetchJobPage } = await import("./ai.server");

    let userContent: string | Array<Record<string, unknown>>;

    if (data.mode === "image") {
      if (!data.image) throw new Error("Gambar belum diunggah.");
      userContent = [
        { type: "text", text: "Baca poster lowongan ini dan ekstrak kualifikasinya sebagai JSON." },
        { type: "image_url", image_url: { url: data.image } },
      ];
    } else if (data.mode === "url") {
      if (!data.url) throw new Error("Link loker belum diisi.");
      const page = await fetchJobPage(data.url);
      userContent = `Ekstrak lowongan dari isi halaman berikut sebagai JSON:\n\n${page}`;
    } else {
      const text = (data.text ?? "").trim();
      if (text.length < 30) throw new Error("Teks lowongan terlalu pendek.");
      userContent = `Ekstrak lowongan berikut sebagai JSON:\n\n${text.slice(0, 20000)}`;
    }

    const result = await aiJson<Partial<JobData>>([
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: userContent },
    ]);

    return {
      title: result.title ?? "",
      company: result.company ?? "",
      location: result.location ?? "",
      employment_type: result.employment_type ?? "",
      responsibilities: result.responsibilities ?? [],
      requirements: result.requirements ?? [],
      skills: result.skills ?? [],
      keywords: result.keywords ?? [],
    };
  });

const JobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  employment_type: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
});

const TAILOR_SYSTEM = `You are a strict CV tailoring assistant. You MUST ONLY use facts provided in the user's Master Data.
Do NOT fabricate companies, job titles, dates, metrics, degrees, certifications, or skills.
You may only rephrase sentence structures, reorder items by relevance, and emphasize keywords from the job description.
Every skill you list must already exist in the Master Data. Write the CV in the same language as the job description.
Return strict JSON:
{
 "match_score": number 0-100,
 "missing_skills": string[],
 "highlights": string[],
 "cv": {
   "name": string, "headline": string,
   "contact": {"email": string, "phone": string, "location": string, "linkedin": string, "portfolio": string},
   "summary": string,
   "experiences": [{"company": string, "position": string, "period": string, "bullets": string[]}],
   "education": [{"institution": string, "degree": string, "period": string, "details": string}],
   "hard_skills": string[], "soft_skills": string[],
   "certifications": [{"name": string, "detail": string}]
 }
}`;

export const tailorCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ job: JobSchema }).parse(data))
  .handler(async ({ data, context }): Promise<TailorResult> => {
    const { aiJson } = await import("./ai.server");
    const supabase = context.supabase;
    const userId = context.userId;

    const [profile, work, edu, skills, creds] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("work_experiences").select("*").eq("user_id", userId),
      supabase.from("educations").select("*").eq("user_id", userId),
      supabase.from("skills").select("*").eq("user_id", userId),
      supabase.from("credentials").select("*").eq("user_id", userId),
    ]);

    const master = {
      profile: profile.data ?? {},
      work_experiences: work.data ?? [],
      education: edu.data ?? [],
      skills: skills.data ?? [],
      certifications_and_projects: creds.data ?? [],
    };

    if (!master.work_experiences.length && !master.education.length) {
      throw new Error("Brankas data masih kosong. Isi dulu pengalaman atau pendidikan Anda.");
    }

    const result = await aiJson<{
      match_score?: number;
      missing_skills?: string[];
      highlights?: string[];
      cv?: Partial<TailoredCv>;
    }>([
      { role: "system", content: TAILOR_SYSTEM },
      {
        role: "user",
        content: `MASTER DATA (satu-satunya sumber fakta):\n${JSON.stringify(master)}\n\nJOB DESCRIPTION:\n${JSON.stringify(data.job)}`,
      },
    ]);

    const cv: TailoredCv = {
      name: result.cv?.name ?? "",
      headline: result.cv?.headline ?? "",
      contact: {
        email: result.cv?.contact?.email ?? "",
        phone: result.cv?.contact?.phone ?? "",
        location: result.cv?.contact?.location ?? "",
        linkedin: result.cv?.contact?.linkedin ?? "",
        portfolio: result.cv?.contact?.portfolio ?? "",
      },
      summary: result.cv?.summary ?? "",
      experiences: result.cv?.experiences ?? [],
      education: result.cv?.education ?? [],
      hard_skills: result.cv?.hard_skills ?? [],
      soft_skills: result.cv?.soft_skills ?? [],
      certifications: result.cv?.certifications ?? [],
    };

    const score = Math.max(0, Math.min(100, Math.round(result.match_score ?? 0)));
    const missing = result.missing_skills ?? [];

    const saved = await supabase
      .from("generated_cvs")
      .insert({
        user_id: userId,
        job_title: data.job.title,
        job_company: data.job.company,
        job_data: data.job,
        match_score: score,
        missing_skills: missing,
        cv,
      })
      .select("id")
      .single();

    return {
      id: saved.data?.id ?? "",
      match_score: score,
      missing_skills: missing,
      highlights: result.highlights ?? [],
      cv,
    };
  });
