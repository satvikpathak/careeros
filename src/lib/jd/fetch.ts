import { isAllowlistedHost, isPrivateHostname } from "./allowlist";

const MAX_BYTES = 200 * 1024;

export function sanitizeHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export class JdFetchError extends Error {
  constructor(public code: "host_blocked" | "private_ip" | "fetch_failed" | "too_large", message: string) {
    super(message);
  }
}

export async function fetchJdText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new JdFetchError("fetch_failed", "Invalid URL");
  }
  if (!isAllowlistedHost(parsed.hostname)) {
    throw new JdFetchError("host_blocked", "Host not allowed");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new JdFetchError("private_ip", "Private hosts blocked");
  }

  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "CareerOS-JD-Fetcher/1.0" },
  });
  if (!res.ok) throw new JdFetchError("fetch_failed", `HTTP ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new JdFetchError("too_large", "JD too large");
    return sanitizeHtmlToText(text);
  }

  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      reader.cancel();
      throw new JdFetchError("too_large", "JD too large");
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return sanitizeHtmlToText(buf.toString("utf8"));
}
