// Text for the Angel (AI) section of the privacy notice. It depends on which AI backend this client actually uses
// (AI_PROVIDER / ANTHROPIC_API_KEY on its server), so the notice never claims something the app does not do.
// Plain strings, no framework imports, so it can be unit-tested.

export type PrivacyAiProvider = "gateway" | "anthropic" | null;

export interface AiDisclosure {
  /** Name of the third-party AI service, or null when no outside AI is used. */
  vendor: string | null;
  /** What happens with a free-form employee question. */
  employee: string;
  /** What happens with a free-form question from the office (Owner/Admin). */
  office: string;
  /** What the provider does with the data, as far as it is known. */
  handling: string;
}

export function aiDisclosure(provider: PrivacyAiProvider): AiDisclosure {
  if (provider === "gateway") {
    return {
      vendor: "Cloudflare Workers AI",
      employee:
        "Pertanyaan yang tidak punya jawaban baku dikirim ke penyedia AI pihak ketiga, yaitu Cloudflare Workers AI, melalui gerbang AI milik kami. Yang ikut terkirim: jabatan, status absen hari ini, jumlah hari hadir, jumlah dan nilai VCR (khusus Tera), total Slip Pay, kasbon terakhir, pengumuman yang aktif, beberapa pesan terakhir di chat, dan pertanyaan Anda. Nama dan kode karyawan dibuang sebelum dikirim.",
      office:
        "Untuk Angel versi kantor (Owner dan admin), pertanyaan bebas hanya disertai angka agregat seluruh karyawan (total dan jumlah) tanpa nama, kode, atau data per orang. Pencarian atau rincian per karyawan diproses di server kami dan tidak dikirim ke penyedia AI.",
      handling:
        "Menurut dokumentasi penyedia, hasil pemrosesan tidak disimpan dan tidak dipakai untuk melatih model. Penyedia tidak menyebutkan lokasi servernya, sehingga pemrosesan dapat terjadi di luar Indonesia.",
    };
  }
  if (provider === "anthropic") {
    return {
      vendor: "Anthropic (Claude)",
      employee:
        "Pertanyaan yang tidak punya jawaban baku dikirim ke penyedia AI pihak ketiga, yaitu Anthropic (Claude). Yang ikut terkirim: jabatan, status absen hari ini, jumlah hari hadir, jumlah dan nilai VCR (khusus Tera), total Slip Pay, kasbon terakhir, pengumuman yang aktif, beberapa pesan terakhir di chat, dan pertanyaan Anda.",
      office:
        "Untuk Angel versi kantor (Owner dan admin), pertanyaan bebas dapat disertai data operasional karyawan yang diminta (absen, VCR, kasbon, dan total Slip Pay), tanpa NIK, nomor HP, email, alamat, atau tanggal lahir.",
      handling:
        "Perlakuan data oleh penyedia mengikuti kebijakan penyedia tersebut, dan pemrosesan dapat terjadi di luar Indonesia.",
    };
  }
  return {
    vendor: null,
    employee: "Saat ini Angel menjawab hanya dengan aturan di server kami. Tidak ada pertanyaan atau data yang dikirim ke penyedia AI pihak ketiga.",
    office: "Hal yang sama berlaku untuk Angel versi kantor.",
    handling: "",
  };
}
