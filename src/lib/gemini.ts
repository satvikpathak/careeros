// ============================================
// CareerOS 2.5 — Google Gemini AI Client
// ============================================

import { GoogleGenerativeAI } from "@google/generative-ai";

let aiInstance: GoogleGenerativeAI | null = null;

export function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    // Simplified initialization to fix type error; SDK handles versioning via model strings
    aiInstance = new GoogleGenerativeAI(apiKey); 
  }
  return aiInstance;
}

// ---- MODULE 1: Career Intelligence Audit ----

export const CAREER_AUDIT_PROMPT = `You are the Career Intelligence Audit AI for CareerOS 2.0.
Your task is to analyze a user's resume and GitHub data to provide a quantified readiness audit.

INPUT DATA:
- Resume Text
- GitHub Profile Analysis (optional)
- Target Role

OUTPUT: Return EXACTLY this JSON:
{
  "readiness_score": 85,
  "market_match_score": 70,
  "project_quality_score": 75,
  "skill_map": {
    "Frontend": 80,
    "Backend": 60,
    "DevOps": 40,
    "DSA": 90,
    "System Design": 50
  },
  "skill_gaps": ["Redux", "Docker", "CI/CD"],
  "depth_vs_breadth": "Analysis of whether the user is a specialist or generalist",
  "ats_recommendations": ["keyword1", "keyword2"],
  "market_alignment_insights": "Brief analysis of how well the user fits current hiring trends"
}

Guidelines:
- readiness_score should be objective and tough.
- project_quality_score should focus on complexity and impact.
- skill_map should cover major engineering categories.
- skill_gaps must be specific to the Target Role.`;

// ---- MODULE 2: Weekly AI Career Sprint Engine ----

export const SPRINT_GENERATOR_PROMPT = `You are the Career Sprint Engine for CareerOS 2.0. 
Every week, you generate a high-impact execution plan for a developer.

CONTEXT:
- Current Skill Map
- Skill Gaps
- Target Role
- Current Progress

OUTPUT: Return EXACTLY this JSON:
{
  "week_number": 1,
  "tasks": [
    {
      "id": "task_1",
      "type": "Skill Development",
      "description": "Learn and implement X in a small project",
      "time_estimate": "4 hours",
      "measurable_outcome": "Completed Code/Certificate"
    },
    { "id": "task_2", "type": "Portfolio Improvement", "description": "Refactor Y in project Z for better performance", "time_estimate": "3 hours", "measurable_outcome": "GH Commit" },
    { "id": "task_3", "type": "Networking", "description": "Connect with 3 developers in Target Role on LinkedIn", "time_estimate": "1 hour", "measurable_outcome": "Sent Requests" },
    { "id": "task_4", "type": "Interview Prep", "description": "Solve 5 Medium DSA problems on topic A", "time_estimate": "5 hours", "measurable_outcome": "Solved Count" }
  ]
}

Guidelines:
- Generate 5 tasks total.
- Tasks must be actionable and measurable.
- Focus on closing the most critical skill gap first.`;

// ---- MODULE 5: AI Project Builder Mode ----

export const PROJECT_BUILDER_PROMPT = `You are the AI Project Builder for CareerOS 2.0.
Generate portfolio-grade project ideas that will WOW recruiters.

OUTPUT: Return EXACTLY this JSON:
[
  {
    "title": "Project Name",
    "description": "Unique selling point and core functionality",
    "tech_stack": ["React", "Go", "PostgreSQL"],
    "features": ["Feature 1", "Feature 2"],
    "architecture": "High-level overview (Microservices/Monolith/Serverless)",
    "deployment_guide": "Platform and tool recommendations",
    "resume_points": ["Bullet 1", "Bullet 2"]
  }
]

Guidelines:
- Generate 3 distinct ideas.
- Ensure ideas are not "generic" (e.g., no simple To-do apps).
- Focus on "Resume-Ready" features that demonstrate seniority.`;

// ---- MODULE 6: Placement Mode (India-Focused) ----

export const PLACEMENT_PREP_PROMPT = `You are the Placement Mode AI for CareerOS 2.0, specializing in the Indian tech hiring landscape.

OUTPUT: Return EXACTLY this JSON:
{
  "company_specific_roadmap": "Analysis for target companies like (TCS, Zomato, Google India, etc.)",
  "dsa_topic_heatmap": { "Arrays": 90, "Graphs": 50, "DP": 70 },
  "hr_question_generator": ["Question 1", "Question 2"],
  "interview_readiness_score": 65
}

Guidelines:
- Tailor advice for Tier 1/2/3 placement scenarios.
- Focus on high-frequency DSA patterns in India.`;

// ---- Chat with Gemini ----

export async function chatWithGemini(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  // 1. Move Personas: Shift any system messages from history to systemInstruction
  const systemMessages = messages.filter(m => m.role === "system");
  const otherMessages = messages.filter(m => m.role !== "system");

  const combinedSystemPrompt = [
    systemPrompt,
    ...systemMessages.map(m => m.content)
  ].filter(Boolean).join("\n\n");

  const model = getAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: {
      role: "system",
      parts: [{ text: combinedSystemPrompt || "You are the CareerOS expert assistant." }]
    }
  });

  // 2. Correct Role Mapping: assistant -> model
  // 3. Fix Gemini History: Ensure history[0].role === 'user' & roles alternate properly
  const historyRaw = otherMessages.slice(0, -1);
  const lastMessage = otherMessages[otherMessages.length - 1];

  let history = historyRaw.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Ensure history[0].role === 'user'
  let userIndex = history.findIndex(h => h.role === "user");
  if (userIndex !== -1) {
    history = history.slice(userIndex);
  } else {
    history = [];
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
}

// ---- Parse Resume with Gemini (Career Audit) ----

export async function parseResumeWithGemini(resumeText: string, targetRole: string = "Software Engineer"): Promise<string> {
  const model = getAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: {
      role: "system",
      parts: [{ text: CAREER_AUDIT_PROMPT }]
    }
  });

  const prompt = `Analyze this resume for the role of ${targetRole}:\n\n${resumeText}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ---- Parse Resume into structured ParsedResume format ----

export const RESUME_PARSE_PROMPT = `You are a resume parsing AI. Extract structured data from the resume text.

OUTPUT: Return EXACTLY this JSON (no markdown, no code fences):
{
  "skills": ["Skill1", "Skill2"],
  "experience_years": "3",
  "education": [
    { "degree": "B.Tech in CS", "institution": "IIT Delhi", "year": "2023" }
  ],
  "projects": [
    { "name": "Project Name", "description": "Brief description", "technologies": ["React", "Node.js"] }
  ],
  "strength_score": 72,
  "missing_keywords": ["Docker", "AWS", "CI/CD"],
  "summary": "Brief 1-2 sentence professional summary"
}

Guidelines:
- Extract ALL skills mentioned in the resume.
- Estimate experience_years from dates or explicit mentions.
- strength_score should be 0-100 based on overall resume quality.
- missing_keywords should be skills commonly needed for the target role but absent from the resume.
- If education or projects are not found, return empty arrays.`;

export async function parseResumeStructured(resumeText: string, targetRole: string = "Software Engineer"): Promise<string> {
  const model = getAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: {
      role: "system",
      parts: [{ text: RESUME_PARSE_PROMPT }]
    }
  });

  const prompt = `Parse this resume for the target role of ${targetRole}:\n\n${resumeText}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ---- Generate Embeddings ----

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getAI().getGenerativeModel({ model: "gemini-embedding-exp-03-07" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch {
    // Fallback: try text-embedding-004
    try {
      const model = getAI().getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch {
      console.warn("All embedding models failed");
      return [];
    }
  }
}
