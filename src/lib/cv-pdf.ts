import { jsPDF } from "jspdf";
import type { CvLanguage, TailoredCv } from "./cv-types";

const MARGIN = 48;
const WIDTH = 595.28; // A4 portrait points
const HEIGHT = 841.89;
const LINE = 13;

const ARABIC = /[\u0600-\u06FF]/;

const LABELS = {
  id: {
    summary: "Ringkasan Profesional",
    work: "Pengalaman Kerja",
    edu: "Pendidikan",
    skills: "Keahlian",
    hard: "Hard Skills",
    soft: "Soft Skills",
    certs: "Sertifikasi & Proyek",
  },
  ar: {
    summary: "الملخص المهني",
    work: "الخبرات العملية",
    edu: "التعليم",
    skills: "المهارات",
    hard: "المهارات التقنية",
    soft: "المهارات الشخصية",
    certs: "الشهادات والمشاريع",
  },
  en: {
    summary: "Professional Summary", work: "Work Experience", edu: "Education",
    skills: "Skills", hard: "Hard Skills", soft: "Soft Skills", certs: "Certifications & Projects",
  },
  ru: {
    summary: "Профессиональное резюме", work: "Опыт работы", edu: "Образование",
    skills: "Навыки", hard: "Технические навыки", soft: "Личные качества", certs: "Сертификаты и проекты",
  },
  fr: {
    summary: "Profil professionnel", work: "Expérience professionnelle", edu: "Formation",
    skills: "Compétences", hard: "Compétences techniques", soft: "Compétences relationnelles", certs: "Certifications et projets",
  },
  es: {
    summary: "Perfil profesional", work: "Experiencia laboral", edu: "Educación",
    skills: "Habilidades", hard: "Habilidades técnicas", soft: "Habilidades interpersonales", certs: "Certificaciones y proyectos",
  },
};

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function printUnicodeCv(cv: TailoredCv, language: CvLanguage) {
  const L = LABELS[language];
  const separator = language === "ar" ? "، " : ", ";
  const contact = [cv.contact.email, cv.contact.phone, cv.contact.location, cv.contact.linkedin, cv.contact.portfolio]
    .filter(Boolean)
    .map((c) => `<span dir="auto">${esc(c)}</span>`)
    .join(" | ");
  const sec = (title: string, body: string) => (body ? `<h2>${title}</h2>${body}` : "");
  const html = `<!doctype html><html lang="${language}" dir="${language === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(cv.name || "CV")}</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:Arial,"Segoe UI",Tahoma,sans-serif;color:#111;font-size:11pt;line-height:1.55;margin:0}
h1{font-size:20pt;margin:0}
h2{font-size:12pt;border-bottom:1px solid #777;margin:16px 0 6px;padding-bottom:2px}
.muted{color:#444;font-size:9.5pt}
ul{margin:4px 0;padding-inline-start:18px}
.item{margin-bottom:8px}
</style></head><body>
<h1>${esc(cv.name)}</h1>
${cv.headline ? `<div>${esc(cv.headline)}</div>` : ""}
<div class="muted">${contact}</div>
${sec(L.summary, cv.summary ? `<p>${esc(cv.summary)}</p>` : "")}
${sec(
    L.work,
    cv.experiences
      .map(
        (e) =>
          `<div class="item"><b>${esc(e.position)} — ${esc(e.company)}</b><div class="muted">${esc(e.period)}</div><ul>${e.bullets
            .map((b) => `<li>${esc(b)}</li>`)
            .join("")}</ul></div>`,
      )
      .join(""),
  )}
${sec(
    L.edu,
    cv.education
      .map(
        (e) =>
          `<div class="item"><b>${esc(e.degree)}${e.degree && e.institution ? " — " : ""}${esc(e.institution)}</b><div class="muted">${esc(e.period)}</div>${e.details ? `<div>${esc(e.details)}</div>` : ""}</div>`,
      )
      .join(""),
  )}
${sec(
    L.skills,
    (cv.hard_skills.length ? `<div><b>${L.hard}:</b> ${esc(cv.hard_skills.join(separator))}</div>` : "") +
      (cv.soft_skills.length ? `<div><b>${L.soft}:</b> ${esc(cv.soft_skills.join(separator))}</div>` : ""),
  )}
${sec(
    L.certs,
    cv.certifications.length
      ? `<ul>${cv.certifications.map((c) => `<li>${esc(c.name)}${c.detail ? ` — ${esc(c.detail)}` : ""}</li>`).join("")}</ul>`
      : "",
  )}
<script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) throw new Error("Izinkan pop-up untuk menyimpan CV sebagai PDF.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// Characters the built-in Helvetica (WinAnsi) font can render.
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function needsUnicodePrint(cv: TailoredCv) {
  for (const ch of JSON.stringify(cv)) {
    const c = ch.codePointAt(0)!;
    if (c > 0xff && !WIN_ANSI_EXTRA.includes(ch)) return true;
  }
  return false;
}

function detectLanguage(cv: TailoredCv): CvLanguage {
  const text = JSON.stringify(cv);
  return cv.language ?? (ARABIC.test(text) ? "ar" : /[\u0400-\u04FF]/.test(text) ? "ru" : "id");
}

export function downloadCvPdf(cv: TailoredCv, fileName = "cv-tailored.pdf") {
  const language = detectLanguage(cv);
  if (language === "ar" || language === "ru" || needsUnicodePrint(cv)) {
    printUnicodeCv(cv, language);
    return;
  }
  buildCvPdf(cv, language).save(fileName);
}

export function buildCvPdf(cv: TailoredCv, language: CvLanguage = detectLanguage(cv)) {
  const L = LABELS[language];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  const maxWidth = WIDTH - MARGIN * 2;

  const pageBreak = (need = LINE) => {
    if (y + need > HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const write = (text: string, size: number, style: "normal" | "bold" = "normal", indent = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth - indent) as string[];
    lines.forEach((line) => {
      pageBreak(size + 4);
      doc.text(line, MARGIN + indent, y);
      y += size + 4;
    });
  };

  const sectionTitle = (title: string) => {
    y += 8;
    pageBreak(24);
    write(title.toUpperCase(), 11, "bold");
    doc.setDrawColor(120);
    doc.line(MARGIN, y - 6, WIDTH - MARGIN, y - 6);
    y += 4;
  };

  write(cv.name || "CV", 18, "bold");
  if (cv.headline) write(cv.headline, 11);
  const contact = [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location,
    cv.contact.linkedin,
    cv.contact.portfolio,
  ]
    .filter(Boolean)
    .join(" | ");
  if (contact) write(contact, 9);

  if (cv.summary) {
    sectionTitle(L.summary);
    write(cv.summary, 10);
  }

  if (cv.experiences.length) {
    sectionTitle(L.work);
    cv.experiences.forEach((exp) => {
      write(`${exp.position} — ${exp.company}`, 10.5, "bold");
      if (exp.period) write(exp.period, 9);
      exp.bullets.forEach((b) => write(`• ${b}`, 10, "normal", 12));
      y += 4;
    });
  }

  if (cv.education.length) {
    sectionTitle(L.edu);
    cv.education.forEach((ed) => {
      write(`${ed.degree}${ed.degree && ed.institution ? " — " : ""}${ed.institution}`, 10.5, "bold");
      if (ed.period) write(ed.period, 9);
      if (ed.details) write(ed.details, 10);
      y += 4;
    });
  }

  if (cv.hard_skills.length || cv.soft_skills.length) {
    sectionTitle(L.skills);
    if (cv.hard_skills.length) write(`${L.hard}: ${cv.hard_skills.join(", ")}`, 10);
    if (cv.soft_skills.length) write(`${L.soft}: ${cv.soft_skills.join(", ")}`, 10);
  }

  if (cv.certifications.length) {
    sectionTitle(L.certs);
    cv.certifications.forEach((c) => write(`• ${c.name}${c.detail ? ` — ${c.detail}` : ""}`, 10));
  }

  return doc;
}
