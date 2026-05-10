import { createHash } from "node:crypto";
import { db } from "@/db";
import { jds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { parseJd, type ParsedJd } from "./parse";

export function contentHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 64);
}

export async function getOrCreateJd(input: {
  userId: number;
  rawText: string;
  sourceUrl?: string | null;
}): Promise<{ id: number; parsed: ParsedJd; rawText: string; sourceUrl: string | null }> {
  const hash = contentHash(input.rawText);

  const existing = await db.query.jds.findFirst({
    where: and(eq(jds.userId, input.userId), eq(jds.contentHash, hash)),
  });
  if (existing) {
    return {
      id: existing.id,
      parsed: existing.parsed as ParsedJd,
      rawText: existing.rawText,
      sourceUrl: existing.sourceUrl ?? null,
    };
  }

  const parsed = await parseJd(input.rawText);
  const [row] = await db.insert(jds).values({
    userId: input.userId,
    sourceUrl: input.sourceUrl ?? null,
    contentHash: hash,
    rawText: input.rawText,
    parsed,
  }).returning();
  return { id: row.id, parsed, rawText: row.rawText, sourceUrl: row.sourceUrl ?? null };
}
