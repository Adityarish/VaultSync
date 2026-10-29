export type VCardContact = {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  addresses: string[];
  notes: string[];
};

type VCardProperty = { name: string; parameters: string; value: string };

export function parseVCard(source: string): VCardContact[] {
  const unfolded = source.replace(/=\r?\n/g, "").replace(/\r?\n[ \t]/g, "");
  return unfolded.split(/BEGIN:VCARD/i).slice(1).map((block) => {
    const properties = block.split(/\r?\n/).map(parseProperty).filter((value): value is VCardProperty => Boolean(value));
    const values = (field: string) => properties.filter((property) => property.name === field)
      .map((property) => decodeVCard(property.value, property.parameters));
    const name = values("FN")[0] ?? formatStructuredName(values("N")[0] ?? "");
    return {
      id: crypto.randomUUID(),
      name,
      phones: unique(values("TEL")),
      emails: unique(values("EMAIL")),
      addresses: unique(values("ADR").map(formatAddress)),
      notes: unique(values("NOTE")),
    };
  }).filter((contact) => contact.name || contact.phones.length || contact.emails.length);
}

export function serializeVCard(contacts: readonly VCardContact[]): string {
  return contacts.map((contact) => [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//VaultSync//Contact Export//EN",
    `N:;${encodeVCard(contact.name)};;;`,
    `FN:${encodeVCard(contact.name)}`,
    ...contact.phones.map((value) => `TEL:${encodeVCard(value)}`),
    ...contact.emails.map((value) => `EMAIL:${encodeVCard(value)}`),
    ...contact.addresses.map((value) => `ADR:;;${encodeVCard(value)};;;;`),
    ...contact.notes.map((value) => `NOTE:${encodeVCard(value)}`),
    "END:VCARD",
  ].join("\r\n")).join("\r\n");
}

function parseProperty(line: string): VCardProperty | undefined {
  const separator = line.indexOf(":");
  if (separator < 0) return undefined;
  const descriptor = line.slice(0, separator);
  const [qualifiedName = "", ...parameters] = descriptor.split(";");
  const name = (qualifiedName.split(".").at(-1) ?? qualifiedName).toUpperCase();
  return { name, parameters: parameters.join(";").toUpperCase(), value: line.slice(separator + 1) };
}

function decodeVCard(value: string, parameters: string) {
  const decoded = parameters.includes("QUOTED-PRINTABLE") ? decodeQuotedPrintable(value, parameters) : value;
  let result = "";
  for (let index = 0; index < decoded.length; index += 1) {
    if (decoded[index] !== "\\" || index === decoded.length - 1) {
      result += decoded[index];
      continue;
    }
    const escaped = decoded[index + 1]!;
    result += escaped.toLowerCase() === "n" ? "\n" : escaped;
    index += 1;
  }
  return result.trim();
}

function decodeQuotedPrintable(value: string, parameters: string) {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const match = value.slice(index).match(/^=([0-9A-Fa-f]{2})/);
    if (match) {
      bytes.push(Number.parseInt(match[1]!, 16));
      index += 2;
    } else {
      bytes.push(...new TextEncoder().encode(value[index]!));
    }
  }
  const charset = parameters.match(/CHARSET=([^;]+)/)?.[1] ?? "utf-8";
  try { return new TextDecoder(charset).decode(new Uint8Array(bytes)); }
  catch { return new TextDecoder().decode(new Uint8Array(bytes)); }
}

function formatStructuredName(value: string) {
  const [family = "", given = "", additional = "", prefix = "", suffix = ""] = value.split(";");
  return [prefix, given, additional, family, suffix].filter(Boolean).join(" ").trim();
}

function formatAddress(value: string) {
  return value.split(";").filter(Boolean).join(", ").trim();
}

function encodeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
