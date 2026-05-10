export const JD_PARSE_PROMPT = `You are parsing a job description. Extract structured fields.

OUTPUT EXACTLY this JSON (no markdown, no commentary):
{
  "title": "string",
  "company": "string",
  "location": "string or null",
  "requirements": ["string", ...],
  "keywords": ["lowercased keyword", ...],
  "niceToHaves": ["string", ...]
}

Keep "keywords" to single technologies / skills / nouns. Lowercase. Dedupe.

JD TEXT:
`;
