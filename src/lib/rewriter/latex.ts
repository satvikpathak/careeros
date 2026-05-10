export interface LatexBullet {
  text: string;
  rawLine: string;
  section: string;
  start: number;
  end: number;
  suggested?: string;
}

const TARGET_SECTIONS = ["experience", "projects", "work experience"];

interface SectionRange { title: string; start: number; end: number; }

function findSectionRanges(src: string): SectionRange[] {
  const re = /\\(?:section|subsection)\*?\{([^}]+)\}/gi;
  const matches: { title: string; idx: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    matches.push({ title: m[1].trim(), idx: m.index });
  }
  const ranges: SectionRange[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : src.length;
    ranges.push({ title: matches[i].title, start, end });
  }
  return ranges;
}

export function extractBullets(src: string): LatexBullet[] {
  const ranges = findSectionRanges(src);
  const bullets: LatexBullet[] = [];

  for (const r of ranges) {
    if (!TARGET_SECTIONS.some((t) => r.title.toLowerCase().includes(t))) continue;
    const slice = src.slice(r.start, r.end);
    const itemRe = /^[ \t]*\\(?:item|resumeItem)\b\{?([^\n]*)/gm;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(slice)) !== null) {
      const matchStart = r.start + m.index;
      const lineEnd = src.indexOf("\n", matchStart);
      const end = lineEnd === -1 ? src.length : lineEnd;
      const rawLine = src.slice(matchStart, end);
      const after = rawLine.replace(/^[ \t]*\\(?:item|resumeItem)\b\{?\s*/, "").replace(/\}\s*$/, "").trim();
      bullets.push({ text: after, rawLine, section: r.title, start: matchStart, end });
    }
  }
  return bullets;
}

export function applyBulletEdits(src: string, edits: (LatexBullet & { suggested?: string })[]): string {
  if (edits.length === 0) return src;
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of sorted) {
    if (!e.suggested) continue;
    const newLine = e.rawLine.replace(/^([ \t]*\\(?:item|resumeItem)\b\{?\s*)([\s\S]*?)(\}\s*)?$/, (_, head, _body, tail) => `${head}${e.suggested}${tail ?? ""}`);
    out = out.slice(0, e.start) + newLine + out.slice(e.end);
  }
  return out;
}
