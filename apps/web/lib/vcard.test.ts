import { describe, expect, it } from "vitest";
import { parseVCard, serializeVCard, type VCardContact } from "./vcard";

describe("vCard utilities", () => {
  it("parses names, multiple phone numbers, grouped fields, and folded lines", () => {
    const source = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Sharma;Aarav;Kumar;Dr.;Jr.",
      "item1.TEL;TYPE=CELL:+91 98765 43210",
      "TEL;TYPE=HOME:+91 11 2345 6789",
      "EMAIL;TYPE=HOME:aarav@example.com",
      "NOTE:Line one\\nLine two that is",
      " folded",
      "END:VCARD",
    ].join("\r\n");

    const [contact] = parseVCard(source);
    expect(contact?.name).toBe("Dr. Aarav Kumar Sharma Jr.");
    expect(contact?.phones).toEqual(["+91 98765 43210", "+91 11 2345 6789"]);
    expect(contact?.emails).toEqual(["aarav@example.com"]);
    expect(contact?.notes).toEqual(["Line one\nLine two that isfolded"]);
  });

  it("decodes quoted-printable UTF-8 contact names", () => {
    const [contact] = parseVCard("BEGIN:VCARD\r\nVERSION:3.0\r\nFN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=E0=A4=86=E0=A4=B0=E0=A4=B5\r\nTEL:+91 90000 00000\r\nEND:VCARD");
    expect(contact?.name).toBe("आरव");
  });

  it("exports one contact as an importable VCF", () => {
    const contact: VCardContact = { id: "one", name: "Meera Iyer", phones: ["+91 99887 76655"], emails: ["meera@example.com"], addresses: ["Bengaluru, India"], notes: ["Friend, colleague"] };
    const exported = serializeVCard([contact]);
    const [roundTrip] = parseVCard(exported);
    expect(roundTrip).toMatchObject({ name: contact.name, phones: contact.phones, emails: contact.emails, notes: contact.notes });
  });
});
