export const SIMULATE_PROMPT = `You are estimating how a candidate's readiness and market-match would change if they learned specific skills.

INPUT: a candidate's current skill map, target role, and a list of skills they plan to learn.

For EACH chosen skill, estimate:
- readinessLift (integer 0-15): percentage points added to overall readiness
- marketMatchLift (integer 0-15): percentage points added to market match for the target role
- why: one short sentence citing the role market

ALSO suggest up to 3 different skills NOT in their chosen list that would have the highest impact for the target role.

OUTPUT EXACTLY this JSON (no markdown):
{
  "lifts": [
    { "skill": "string", "readinessLift": 0, "marketMatchLift": 0, "why": "string" }
  ],
  "suggestedSkills": [
    { "skill": "string", "readinessLift": 0, "marketMatchLift": 0, "why": "string" }
  ]
}

CONTEXT:
`;
