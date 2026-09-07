# Impor Otomatis: Unggah PDF/Foto, Data Terisi Sendiri

Alih-alih mengetik satu per satu di Brankas Data, Anda cukup mengunggah berkas mentah (CV lama, ijazah, sertifikat, portofolio, atau fotonya) lalu sistem membaca isinya dan mengisikan datanya untuk Anda periksa sebelum disimpan.

## Cara kerja untuk pengguna

1. Di halaman Brankas Data ada tab baru "Impor Otomatis".
2. Seret atau pilih beberapa berkas sekaligus (PDF, JPG, PNG). Bisa campur: CV lama + beberapa sertifikat.
3. Tekan "Baca semua berkas". Muncul indikator proses per berkas.
4. Hasil bacaan tampil sebagai daftar usulan yang dikelompokkan: Profil, Pengalaman, Pendidikan, Skill, Sertifikasi & Proyek.
5. Setiap usulan punya centang (pilih/abaikan) dan bisa diedit langsung di tempat sebelum disimpan.
6. Tekan "Simpan ke Brankas" — hanya yang dicentang yang masuk. Duplikat (nama perusahaan + posisi sama, atau nama sertifikat sama) ditandai dan tidak dicentang secara default.

Aturan penting: sistem hanya menyalin apa yang benar-benar tertulis di berkas. Kalau sesuatu tidak terbaca, kolomnya dibiarkan kosong, bukan dikarang.

## Batasan

- Ukuran per berkas maksimal 10 MB, maksimal 10 berkas sekali unggah.
- PDF hasil pindai (gambar) tetap terbaca karena dibaca sebagai gambar.
- Berkas Word/Excel belum didukung di tahap ini; sarankan simpan sebagai PDF.

## Detail teknis

- Server function baru `importDocuments` di `src/lib/vault-import.functions.ts`, memakai `requireSupabaseAuth`.
  - Menerima daftar berkas sebagai data URL base64 (`data:<mime>;base64,...`) dari klien.
  - PDF dikirim ke Lovable AI Gateway sebagai blok `{type:"file", file:{filename, file_data}}`; JPG/PNG sebagai blok `image_url`. Model: `google/gemini-3.7-flash` lewat `aiJson` yang sudah ada di `src/lib/ai.server.ts`.
  - Satu panggilan per berkas (paralel terbatas), agar satu berkas gagal tidak menggagalkan semuanya; hasil per berkas berisi `{ ok, error?, data }`.
  - System prompt anti-halusinasi: hanya ekstraksi literal, kosongkan yang tidak ada, pertahankan bahasa asli dokumen.
- Tipe baru `VaultImportResult` di `src/lib/cv-types.ts`: `{ profile: Partial<Profile>, work_experiences[], educations[], skills[], credentials[] }` mengikuti kolom tabel yang sudah ada.
- Komponen baru `src/components/vault-import.tsx`: dropzone (`input[type=file]` multiple + drag & drop), pembaca `FileReader` ke data URL, state per berkas, daftar usulan dengan checkbox + field editable, dan aksi simpan.
- Penyimpanan dilakukan dari klien memakai Supabase client yang sudah ada (RLS `user_id = auth.uid()`): `insert` massal ke `work_experiences`, `educations`, `skills`, `credentials`; `upsert` untuk `profiles` yang hanya mengisi kolom yang masih kosong kecuali pengguna mencentang timpa.
- Deteksi duplikat di klien terhadap data brankas yang sudah dimuat, lalu `invalidateQueries` setelah simpan.
- Tab baru ditambahkan di `src/routes/_authenticated/vault.tsx` tanpa mengubah tab yang ada.
- Tidak memakai Storage: berkas hanya diproses di memori dan tidak disimpan, jadi tidak ada bucket baru.
