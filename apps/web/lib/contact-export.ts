import { serializeVCard, type VCardContact } from "./vcard";

export async function exportContactToDevice(contact: VCardContact): Promise<"shared" | "downloaded" | "cancelled"> {
  const filename = `${safeFilename(contact.name || "contact")}.vcf`;
  const file = new File([serializeVCard([contact])], filename, { type: "text/vcard;charset=utf-8", lastModified: Date.now() });
  const shareData: ShareData = { files: [file], title: contact.name || "Contact", text: `Import ${contact.name || "this contact"} into your contacts app.` };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded";
}

function safeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").slice(0, 80) || "contact";
}
