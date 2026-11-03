/** Fetches a URL and returns the file, honoring the server's Content-Disposition filename when present. */
export async function fetchFile(url: string, fallbackName: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text().catch(() => "Gagal mengunduh."));

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;
  return { blob: await res.blob(), filename };
}

/** Saves a blob through the browser's normal download (lands in the Downloads folder). */
export function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
