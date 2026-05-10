export const GAP_PROMPT = `You are a resume vs JD gap analyzer.

Given the JD's keywords/requirements and the candidate's skill map, produce concrete edit suggestions for the resume that close the gap WITHOUT inventing experience.

OUTPUT EXACTLY this JSON (no markdown):
{
  "suggestions": [
    {
      "section": "Experience" | "Projects" | "Skills" | "Summary",
      "original": "string or null",
      "suggested": "string",
      "rationale": "one short sentence"
    }
  ]
}

Up to 12 suggestions. Be specific.

JD:
`;
