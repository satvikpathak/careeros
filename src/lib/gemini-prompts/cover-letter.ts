export const COVER_LETTER_PROMPT = (tone: string) => `Write a cover letter in a ${tone} tone.

Rules:
- 3 short paragraphs.
- First: hook + role + one specific reason for the company.
- Second: 2 concrete achievements from the candidate that match the JD's top requirements.
- Third: brief close + availability.
- Plain text. No markdown, no bullet points.

JD:
`;
