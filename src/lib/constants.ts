// ============================================
// CareerOS — Static Role Configuration (MVP)
// ============================================

import type { User, CareerAudit, WeeklySprint } from "./types";

export interface RoleConfig {
  title: string;
  base_salary: number;
  growth_rate: number;
  market_demand: number;
  risk_level: "low" | "medium" | "high";
  top_skills: string[];
}


export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  "Software Engineer": {
    title: "Software Engineer",
    base_salary: 95000,
    growth_rate: 0.08,
    market_demand: 92,
    risk_level: "low",
    top_skills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git", "AWS", "Docker"],
  },
  "Data Scientist": {
    title: "Data Scientist",
    base_salary: 105000,
    growth_rate: 0.1,
    market_demand: 88,
    risk_level: "low",
    top_skills: ["Python", "Machine Learning", "SQL", "TensorFlow", "Statistics", "Pandas", "R"],
  },
  "Product Manager": {
    title: "Product Manager",
    base_salary: 110000,
    growth_rate: 0.07,
    market_demand: 78,
    risk_level: "medium",
    top_skills: ["Strategy", "Analytics", "Agile", "User Research", "Roadmapping", "SQL"],
  },
  "DevOps Engineer": {
    title: "DevOps Engineer",
    base_salary: 100000,
    growth_rate: 0.09,
    market_demand: 90,
    risk_level: "low",
    top_skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform", "Linux", "Python"],
  },
  "UX Designer": {
    title: "UX Designer",
    base_salary: 85000,
    growth_rate: 0.06,
    market_demand: 75,
    risk_level: "medium",
    top_skills: ["Figma", "User Research", "Prototyping", "Design Systems", "CSS", "Accessibility"],
  },
  "Frontend Developer": {
    title: "Frontend Developer",
    base_salary: 88000,
    growth_rate: 0.07,
    market_demand: 85,
    risk_level: "low",
    top_skills: ["React", "TypeScript", "CSS", "Next.js", "Testing", "Performance", "Accessibility"],
  },
  "Backend Developer": {
    title: "Backend Developer",
    base_salary: 92000,
    growth_rate: 0.08,
    market_demand: 87,
    risk_level: "low",
    top_skills: ["Node.js", "Python", "SQL", "APIs", "Microservices", "Docker", "Redis"],
  },
  "Machine Learning Engineer": {
    title: "Machine Learning Engineer",
    base_salary: 120000,
    growth_rate: 0.12,
    market_demand: 94,
    risk_level: "low",
    top_skills: ["Python", "PyTorch", "TensorFlow", "MLOps", "Deep Learning", "NLP", "Computer Vision"],
  },
  "Cloud Architect": {
    title: "Cloud Architect",
    base_salary: 135000,
    growth_rate: 0.09,
    market_demand: 91,
    risk_level: "low",
    top_skills: ["AWS", "Azure", "GCP", "Infrastructure", "Security", "Networking", "Terraform"],
  },
  "Cybersecurity Analyst": {
    title: "Cybersecurity Analyst",
    base_salary: 95000,
    growth_rate: 0.11,
    market_demand: 96,
    risk_level: "low",
    top_skills: ["Network Security", "SIEM", "Incident Response", "Penetration Testing", "Compliance"],
  },
  "Full Stack Developer": {
    title: "Full Stack Developer",
    base_salary: 98000,
    growth_rate: 0.08,
    market_demand: 89,
    risk_level: "low",
    top_skills: ["React", "Node.js", "TypeScript", "SQL", "AWS", "Docker", "REST APIs"],
  },
  "Business Analyst": {
    title: "Business Analyst",
    base_salary: 78000,
    growth_rate: 0.05,
    market_demand: 70,
    risk_level: "medium",
    top_skills: ["SQL", "Excel", "Requirements", "Stakeholder Management", "Agile", "Tableau"],
  },
};

// ---- Salary Simulation ----

export function simulateSalaryGrowth(
  baseSalary: number,
  growthRate: number,
  years: number
): { year: number; salary: number }[] {
  const data = [];
  for (let y = 0; y <= years; y++) {
    data.push({
      year: new Date().getFullYear() + y,
      salary: Math.round(baseSalary * Math.pow(1 + growthRate, y)),
    });
  }
  return data;
}

// ---- Market Demand Simulation ----

export function simulateMarketDemand(
  baseDemand: number,
  months: number = 12
): { month: string; demand: number }[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data = [];
  const currentMonth = new Date().getMonth();
  
  for (let m = 0; m < months; m++) {
    const monthIndex = (currentMonth + m) % 12;
    const seasonalFactor = 1 + 0.1 * Math.sin((2 * Math.PI * monthIndex) / 12);
    const trendFactor = 1 + 0.005 * m;
    const noise = 0.95 + Math.random() * 0.1;
    
    data.push({
      month: monthNames[monthIndex],
      demand: Math.round(baseDemand * seasonalFactor * trendFactor * noise),
    });
  }
  return data;
}

// ---- ATS Score Calculation ----

export function calculateATSScore(
  resumeSkills: string[],
  targetRoleSkills: string[],
  experienceYears: number
): { score: number; keywordCoverage: number; roleAlignment: number; experienceWeight: number } {
  const normalizedResumeSkills = resumeSkills.map((s) => s.toLowerCase());
  const normalizedTargetSkills = targetRoleSkills.map((s) => s.toLowerCase());

  const matchedSkills = normalizedTargetSkills.filter((s) =>
    normalizedResumeSkills.some((rs) => rs.includes(s) || s.includes(rs))
  );

  const keywordCoverage = normalizedTargetSkills.length > 0
    ? (matchedSkills.length / normalizedTargetSkills.length) * 100
    : 0;

  const roleAlignment = Math.min(keywordCoverage * 1.1, 100);

  const experienceWeight = Math.min(experienceYears * 10, 100);

  const score = Math.round(keywordCoverage * 0.5 + roleAlignment * 0.3 + experienceWeight * 0.2);

  return {
    score: Math.min(score, 100),
    keywordCoverage: Math.round(keywordCoverage),
    roleAlignment: Math.round(roleAlignment),
    experienceWeight: Math.round(experienceWeight),
  };
}

// ============================================
// CareerOS 2.0 — Constants
// ============================================

