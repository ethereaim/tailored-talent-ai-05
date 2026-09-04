import { jsPDF } from "jspdf";
import type { TailoredCv } from "./cv-types";

const MARGIN = 48;
const WIDTH = 595.28; // A4 portrait points
const HEIGHT = 841.89;
const LINE = 13;

export function downloadCvPdf(cv: TailoredCv, fileName = "cv-tailored.pdf") {
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

  write(cv.name || "Nama", 18, "bold");
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
    sectionTitle("Professional Summary");
    write(cv.summary, 10);
  }

  if (cv.experiences.length) {
    sectionTitle("Work Experience");
    cv.experiences.forEach((exp) => {
      write(`${exp.position} — ${exp.company}`, 10.5, "bold");
      if (exp.period) write(exp.period, 9);
      exp.bullets.forEach((b) => write(`• ${b}`, 10, "normal", 12));
      y += 4;
    });
  }

  if (cv.education.length) {
    sectionTitle("Education");
    cv.education.forEach((ed) => {
      write(`${ed.degree}${ed.degree && ed.institution ? " — " : ""}${ed.institution}`, 10.5, "bold");
      if (ed.period) write(ed.period, 9);
      if (ed.details) write(ed.details, 10);
      y += 4;
    });
  }

  if (cv.hard_skills.length || cv.soft_skills.length) {
    sectionTitle("Skills");
    if (cv.hard_skills.length) write(`Hard Skills: ${cv.hard_skills.join(", ")}`, 10);
    if (cv.soft_skills.length) write(`Soft Skills: ${cv.soft_skills.join(", ")}`, 10);
  }

  if (cv.certifications.length) {
    sectionTitle("Certifications & Projects");
    cv.certifications.forEach((c) => write(`• ${c.name}${c.detail ? ` — ${c.detail}` : ""}`, 10));
  }

  doc.save(fileName);
}
