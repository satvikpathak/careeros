export interface DiffSegment {
  section: string;
  index: number;
  original: string;
  suggested: string;
  rationale?: string;
  accepted: boolean | null;
}

export interface RewriteSection {
  title: string;
  originalBullets: string[];
  rewrittenBullets: string[];
  rationale?: string;
}

export interface RewriteOutput {
  sections: RewriteSection[];
}

export function buildDiffSegments(out: RewriteOutput): DiffSegment[] {
  const segments: DiffSegment[] = [];
  for (const s of out.sections) {
    const n = Math.min(s.originalBullets.length, s.rewrittenBullets.length);
    for (let i = 0; i < n; i++) {
      segments.push({
        section: s.title,
        index: i,
        original: s.originalBullets[i],
        suggested: s.rewrittenBullets[i],
        rationale: s.rationale,
        accepted: null,
      });
    }
  }
  return segments;
}

export function applyAccepted(segments: DiffSegment[]): { section: string; bullets: string[] }[] {
  const bySection = new Map<string, string[]>();
  for (const s of segments) {
    const arr = bySection.get(s.section) ?? [];
    arr[s.index] = s.accepted === false ? s.original : s.suggested;
    bySection.set(s.section, arr);
  }
  return Array.from(bySection.entries()).map(([section, bullets]) => ({ section, bullets }));
}
