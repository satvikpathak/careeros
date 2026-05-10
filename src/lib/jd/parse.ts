import { parseResumeWithGemini } from "@/lib/gemini";
import { JD_PARSE_PROMPT } from "@/lib/gemini-prompts/jd-parse";

export interface ParsedJd {
  title: string;
  company: string;
  location: string | null;
  requirements: string[];
  keywords: string[];
  niceToHaves: string[];
}

const EMPTY: ParsedJd = {
  title: "",
  company: "",
  location: null,
  requirements: [],
  keywords: [],
  niceToHaves: [],
};

export async function parseJd(text: string): Promise<ParsedJd> {
  const raw = await parseResumeWithGemini(`${JD_PARSE_PROMPT}\n\n${text}`, "");
  try {
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const json = JSON.parse(m ? m[1] : raw);
    return {
      title: String(json.title ?? ""),
      company: String(json.company ?? ""),
      location: json.location ?? null,
      requirements: Array.isArray(json.requirements) ? json.requirements.map(String) : [],
      keywords: Array.isArray(json.keywords) ? json.keywords.map((k: any) => String(k).toLowerCase()) : [],
      niceToHaves: Array.isArray(json.niceToHaves) ? json.niceToHaves.map(String) : [],
    };
  } catch {
    return EMPTY;
  }
}
