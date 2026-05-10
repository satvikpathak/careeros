export const OUTREACH_PROMPT = `Generate ONE concise cold email and ONE LinkedIn DM for this candidate to send to a recruiter / hiring manager about the role.

Rules:
- The email is 4-6 sentences. The DM is no more than 300 characters.
- Mention 1 specific reason for the company drawn from the JD.
- Cite 1 concrete achievement from the candidate's audit.
- No emojis. At most one exclamation mark, in the close only.
- The candidate sends this themselves — write in first person.

OUTPUT EXACTLY this JSON (no markdown, no commentary):
{
  "emailSubject": "string",
  "emailBody": "string",
  "dmBody": "string"
}

JD:
`;
