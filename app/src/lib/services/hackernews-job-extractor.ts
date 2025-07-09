import { runPromptWithTogetherAI } from './llm';

export interface HackerNewsJobData {
  jobTitle?: string;
  company?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  roleOverview?: string;
  keyRequirements?: string[];
  technologies?: string[];
  experienceLevel?: string;
  contactInfo?: string;
  confidence: number;
  isValidJobPosting: boolean;
  extractedAt: number;
}

export async function extractJobFromComment(commentText: string): Promise<HackerNewsJobData> {
  const prompt = `
Extract job information from this HackerNews comment. Most HackerNews job comments follow a format like:

"Job Title | Location | Salary | Technologies

Company description and what they do.

Responsibilities:
• Task 1
• Task 2

Requirements:
• Requirement 1
• Requirement 2

Contact: email@company.com"

COMMENT TEXT:
${commentText}

Extract the following information and return it as JSON:

{
  "jobTitle": "exact job title from the comment",
  "company": "company name",
  "location": "location (city, remote, hybrid, etc.)",
  "salary": "salary range or amount mentioned",
  "employmentType": "Full-time, Part-time, Contract, Intern, etc.",
  "roleOverview": "brief 1-2 sentence summary of the role",
  "keyRequirements": ["requirement1", "requirement2"],
  "technologies": ["tech1", "tech2"],
  "experienceLevel": "Junior, Mid, Senior, etc.",
  "contactInfo": "email or application instructions",
  "isValidJobPosting": true,
  "confidence": 1-5
}

Rules:
- Only extract information that is explicitly mentioned
- Use null for missing fields
- confidence: 1 (very uncertain) to 5 (very confident)
- Keep arrays concise (max 5 items each)
- Extract exact text, don't paraphrase

Return ONLY the JSON object, no other text.`;

  const response = await runPromptWithTogetherAI(prompt);
  const jsonResponse = JSON.parse(response);
  
  return {
    jobTitle: jsonResponse.jobTitle || undefined,
    company: jsonResponse.company || undefined,
    location: jsonResponse.location || undefined,
    salary: jsonResponse.salary || undefined,
    employmentType: jsonResponse.employmentType || undefined,
    roleOverview: jsonResponse.roleOverview || undefined,
    keyRequirements: Array.isArray(jsonResponse.keyRequirements) ? jsonResponse.keyRequirements : [],
    technologies: Array.isArray(jsonResponse.technologies) ? jsonResponse.technologies : [],
    experienceLevel: jsonResponse.experienceLevel || undefined,
    contactInfo: jsonResponse.contactInfo || undefined,
    confidence: Math.max(1, Math.min(5, Number(jsonResponse.confidence) || 3)),
    isValidJobPosting: Boolean(jsonResponse.isValidJobPosting),
    extractedAt: Date.now(),
  };
}