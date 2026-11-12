/** Saudi mobile -> international digits for wa.me (0551234567 / 551234567 / +966551234567 -> 966551234567). */
export function intlPhone(p: string): string {
  let d = p.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("966")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return `966${d}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Share the PDF through the phone's share sheet (WhatsApp etc.). Returns false when unsupported. */
export async function sharePdf(blob: Blob, filename: string, text: string): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: filename });
      return true;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return true; // user closed the sheet
  }
  return false;
}

export const waLink = (phoneIntl: string, text: string) => `https://wa.me/${phoneIntl}?text=${encodeURIComponent(text)}`;
