# CV Matchmaker Pro

Product Requirement Document (PRD)

AI-Powered Tailored CV Generator (MVP Phase 1)

1. Executive Summary & Problem Statement

1.1 Problem Statement

Menyesuaikan (tailoring) isi CV agar relevan dengan kualifikasi tiap lowongan kerja (Loker) membutuhkan waktu yang lama (30–60 menit per lamaran). Pencari kerja sering kali gagal menembus tahap seleksi awal (Applicant Tracking System / ATS) karena kosa kata (keywords) dan narasi pada CV tidak selaras dengan kriteria lowongan, meskipun pengguna sebenarnya memiliki pengalaman relevan.

1.2 Product Vision

Membuat web application berbasis AI yang memungkinkan pengguna menyimpan seluruh pengalaman hidupnya (Master Data) sekali saja, lalu secara otomatis menghasilkan CV berformat ATS-friendly yang disesuaikan (tailored) dengan deskripsi pekerjaan yang di-input (melalui Teks, Link, atau Gambar Poster Loker).

2. Target Audience & Core Value Proposition

Target Audience: Job seekers, fresh graduates, profesional karir menengah, dan freelancer yang aktif melamar banyak posisi kerja secara spesifik.

Core Value Proposition:

Efficiency: Memangkas waktu pembuatan CV dari 45 menit menjadi < 2 menit.

Accuracy & Relevance: Meningkatkan Match Score dengan kriteria loker tanpa memalsukan (halusinasi) data riwayat kerja pengguna.

Flexibility: Mampu mengekstrak kualifikasi loker dari berbagai format (Link Web, Teks Manual, hingga Poster/Flyer Gambar).

3. Core Features & Functional Specifications

3.1 Feature Module 1: Master Data Vault (Brankas Data)

Satu tempat penyimpanan terpusat untuk seluruh riwayat karir pengguna.

Struktur Data:

Data Pribadi: Nama lengkap, kontak, lokasi, LinkedIn URL, portofolio link.

Ringkasan Profil (Professional Summary): Draft teks awal/poin penting.

Pengalaman Kerja (Work Experience): Perusahaan, Posisi, Periode, Deskripsi Tugas, Poin Pencapaian (Bullet point achievements).

Pendidikan (Education): Institusi, Jurusan, Tahun, IPK, Kegiatan.

Skills: Hard Skills & Soft Skills (dilengkapi level/kategori).

Sertifikasi & Proyek (Certifications & Projects): Nama proyek/sertifikat, deskripsi singkat, tahun.

Kemampuan:

Tambah/edit/hapus entitas data dengan intuitif.

Opsi impor data dari file PDF CV lama (opsional untuk versi lanjut, manual form untuk MVP).

3.2 Feature Module 2: Multi-Modal Job Requirement Input

Sistem input fleksibel untuk mengambil data kualifikasi pekerjaan dari 3 jalur berbeda:

Input Teks Manual: Kolom textarea besar untuk copy-paste deskripsi lowongan.

Input Link URL: Kolom input link loker (dengan scraping engine sederhana atau fallback jika situs terproteksi).

Input Gambar / Poster (Vision OCR):

Pengguna mengunggah gambar (.png, .jpg, .jpeg) berupa flyer/poster loker dari media sosial (Instagram/LinkedIn/WA).

AI Multimodal mengekstrak teks dan merapikan kualifikasi pekerjaan secara otomatis.

Review & Confirmation Step (Crucial):

Sebelum diproses, AI menampilkan ekstrak data loker (Posisi, Syarat Skill, Kualifikasi Utama) untuk dikonfirmasi/editsingkat oleh pengguna.

3.3 Feature Module 3: AI Matching & CV Tailoring Engine

Modul pintar yang memproses pencocokan data:

Match Score Indicator: Menampilkan estimasi persentase kesesuaian profil pengguna terhadap loker (misal: "80% Match") beserta daftar missing skills atau area yang ditonjolkan.

Contextual Rewriting: AI memilih pengalaman paling relevan dari Master Data Vault, mengubah gaya penulisan agar menyertakan keywords dari loker tanpa mengubah fakta riwayat kerja.

Strict Anti-Hallucination Rules: AI dilarang keras mengarang pengalaman, posisi, atau angka pencapaian yang tidak tertera di Master Data Vault.

3.4 Feature Module 4: ATS PDF Generator

Tampilan antarmuka live preview CV yang baru di-generate.

Ekspor dokumen langsung ke format PDF standar ATS:

Menggunakan font standar (Arial/Helvetica/Calibri).

Teks dapat di-blok dan dibaca oleh mesin ATS (selectable text, bukan PDF gambar).

Layout bersih (1 kolom atau 2 kolom ATS-friendly tanpa elemen grafis yang membingungkan parser ATS).

4. User Journey Flow

[1. User Auth & Login]
         ↓
[2. Pengisian Master Data Vault] (Hanya sekali di awal, bisa diperbarui kapan saja)
         ↓
[3. Halaman "Generate New CV"]
         ↓
[4. Pilih Metode Input Loker] ---> (Teks / Link / Upload Poster Gambar)
         ↓
[5. Ekstraksi & Konfirmasi Kualifikasi Loker]
         ↓
[6. AI Matching Engine] ---------> (Tampilkan Match Score + Rekomendasi Penyesuaian)
         ↓
[7. Preview CV Tailored] --------> (Bisa di-edit manual teksnya jika perlu)
         ↓
[8. Download ATS PDF]



5. System Architecture & Tech Stack Recommendation

5.1 Tech Stack (Optimized for Lovable.dev Deployment)

Frontend Framework: React + TypeScript + Tailwind CSS (Native Lovable stack).

Backend & Database: Supabase (Auth, PostgreSQL for Master Data, Storage for Uploaded Images).

AI Engine (Multimodal):

Text & Matching: OpenAI API (gpt-4o / gpt-4o-mini) atau Anthropic Claude API (claude-3-5-sonnet).

Image Vision/OCR: GPT-4o Vision API untuk analisis gambar poster loker.

PDF Exporter: react-pdf atau html2pdf.js untuk membuat file PDF ATS-friendly berbasis teks.

6. Non-Functional Requirements & Guardrails

Data Privacy & Security: Data pengalaman karir pengguna disimpan secara aman di PostgreSQL Supabase dengan Row Level Security (RLS) sehingga hanya pengguna pemilik akun yang bisa mengakses data tersebut.

Response Time Target:

OCR Gambar Loker: < 5 detik.

Generasi CV lengkap: < 10 detik.

Guardrail Prompting (Anti-Hallucination):

"System Prompt Directive: You are a strict CV tailoring assistant. You MUST ONLY use facts provided in the user's Master Data. Do NOT fabricate companies, years of experience, or skills. You may only rephrase sentence structures and emphasize keywords to match the Job Description."

7. MVP Scope Limits (Out of Scope for Phase 1)

Untuk memastikan proyek siap diluncurkan secara cepat via Lovable, fitur berikut ditunda ke Phase 2:

Integrasi otomatis pendaftaran langsung ke portal loker (Auto-apply bot).

Ekspor file dalam format .docx (Microsoft Word) — fokus awal hanya .pdf.

Template CV dengan desain grafis berwarna/kompleks (fokus awal pada template kaku standar ATS).

8. Success Metrics (KPIs)

Success Rate Processing: > 95% ekstrasi data dari gambar poster loker berhasil dibaca tanpa error.

User Retention: Pengguna kembali memakai platform untuk lamaran ke-2 dan seterusnya.

Satisfaction Score: Kecepatan pembuatan CV dan relevansi hasil tailored text.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7cc1e854-813f-4088-a843-dbac55fb4288).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
