import { createHash } from "node:crypto";

export function auditFingerprint(userId: string | number, resumeText: string, targetRole: string): string {
  return createHash("sha256")
    .update(String(userId))
    .update("|")
    .update(resumeText.trim())
    .update("|")
    .update(targetRole.trim().toLowerCase())
    .digest("hex");
}
