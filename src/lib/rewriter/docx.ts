import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { applyAccepted, type DiffSegment } from "./diff";

export async function renderDocxFromSegments(input: {
  candidateName: string;
  segments: DiffSegment[];
}): Promise<Buffer> {
  const grouped = applyAccepted(input.segments);

  const children: Paragraph[] = [];
  children.push(new Paragraph({
    children: [new TextRun({ text: input.candidateName || "Resume", bold: true, size: 32 })],
  }));

  for (const g of grouped) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: g.section, bold: true, size: 24 })],
    }));
    for (const b of g.bullets) {
      if (!b) continue;
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: b, size: 22 })],
      }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
