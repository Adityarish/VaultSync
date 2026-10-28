export type VCardContact = { id: string; name: string; phones: string[]; emails: string[]; addresses: string[]; notes: string[] };

export function parseVCard(source: string): VCardContact[] {
  const unfolded = source.replace(/\r?\n[ \t]/g, "");
  return unfolded.split(/BEGIN:VCARD/i).slice(1).map((block) => {
    const lines = block.split(/\r?\n/);
    const values = (field: string) => lines.filter((line) => line.toUpperCase().startsWith(field) && line.includes(":"))
      .map((line) => decodeVCard(line.slice(line.indexOf(":") + 1)));
    const name = values("FN")[0] ?? values("N")[0]?.split(";").filter(Boolean).reverse().join(" ") ?? "";
    return { id: crypto.randomUUID(), name, phones: values("TEL"), emails: values("EMAIL"), addresses: values("ADR"), notes: values("NOTE") };
  }).filter((contact) => contact.name || contact.phones.length || contact.emails.length);
}

function decodeVCard(value: string) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}
