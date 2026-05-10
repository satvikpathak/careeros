import { describe, it, expect } from "vitest";
import { extractBullets, applyBulletEdits } from "@/lib/rewriter/latex";

const SAMPLE = String.raw`
\documentclass{article}
\begin{document}
\section{Education}
\textbf{MIT}, B.S. in CS

\section{Experience}
\textbf{Acme Corp} -- Senior Engineer
\begin{itemize}
\item Built service handling 10M req/day
\item Led team of 4 engineers
\end{itemize}

\section{Skills}
TypeScript, React
\end{document}
`;

describe("extractBullets", () => {
  it("finds items inside Experience section only", () => {
    const bullets = extractBullets(SAMPLE);
    expect(bullets.length).toBe(2);
    expect(bullets[0].text).toContain("Built service");
    expect(bullets[1].text).toContain("Led team");
  });

  it("skips Education and Skills sections", () => {
    const bullets = extractBullets(SAMPLE);
    expect(bullets.every((b) => !b.text.includes("MIT"))).toBe(true);
    expect(bullets.every((b) => !b.text.includes("TypeScript"))).toBe(true);
  });
});

describe("applyBulletEdits", () => {
  it("replaces bullet text in source preserving \\item", () => {
    const bullets = extractBullets(SAMPLE);
    const edits = bullets.map((b, i) => ({ ...b, suggested: `Edited ${i}` }));
    const out = applyBulletEdits(SAMPLE, edits);
    expect(out).toContain("\\item Edited 0");
    expect(out).toContain("\\item Edited 1");
    expect(out).not.toContain("\\item Built service");
  });

  it("returns input unchanged when no edits", () => {
    expect(applyBulletEdits(SAMPLE, [])).toBe(SAMPLE);
  });
});
