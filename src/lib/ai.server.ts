type Message = {
  role: "system" | "user";
  content: string | Array<Record<string, unknown>>;
};

export async function aiJson<T>(messages: Message[]): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI belum dikonfigurasi.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("Terlalu banyak permintaan AI. Coba lagi sebentar lagi.");
    if (res.status === 402)
      throw new Error("Kredit AI habis. Tambahkan kredit di workspace Lovable untuk melanjutkan.");
    throw new Error(`AI gagal memproses (${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("AI mengembalikan format yang tidak dikenali.");
  }
}

export async function fetchJobPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Situs loker tidak bisa dibuka (${res.status}). Salin-tempel teksnya saja.`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 200)
    throw new Error("Isi halaman tidak terbaca (mungkin terproteksi). Salin-tempel teks lokernya saja.");
  return text.slice(0, 15000);
}
