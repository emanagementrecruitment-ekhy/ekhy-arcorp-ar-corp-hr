import LokasiPage from "@/components/admin/LokasiPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <LokasiPage initialTab={tab === "kalender" ? "kalender" : "lokasi"} />;
}
