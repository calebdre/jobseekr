import { JobAnalysis } from '../../types/job.types';
import { runPromptWithTogetherAI } from "./llm";

const hackerNewsJobPrompt = (resume: string, preferences: string, comment: string) => `You are analyzing a brief HackerNews job posting comment to help a job seeker decide if it's worth pursuing.

RESUME:
${resume}

PREFERENCES:
${preferences}

HACKERNEWS COMMENT:
${comment}

This is a short, informal job posting from HackerNews - not a full job description. It might be just 1-3 sentences with basic info like company, role, tech stack, salary, and contact info.

Your job is to quickly assess if this opportunity aligns with their background and preferences.

ASSESSMENT CRITERIA:
1. **Deal-breakers first**: Location requirements, work authorization, must-have skills
2. **Experience match**: Do they have relevant background for this role?
3. **Preference alignment**: Tech stack, company stage, salary range, remote policy

RECOMMENDATIONS:
- **apply**: Good match with their background AND preferences, worth reaching out
- **maybe**: Unclear from the brief posting, or mixed signals (some good fit, some concerns)
- **skip**: Clear mismatch with their requirements or preferences

Keep your analysis conversational and concise - this is a quick screening, not a deep dive.

Respond with JSON in this EXACT format:
{
  "recommendation": "apply|maybe|skip",
  "confidence": 1-5,
  "fitScore": 1-5,
  "job_summary": "What role/company is this and what would they likely do?",
  "company_summary": "What we know about the company from this brief posting",
  "fit_summary": "Why this is/isn't a good fit - lead with the most important reason",
  "why_good_fit": [
    "Specific matches with their background",
    "Aligns with their stated preferences"
  ],
  "potential_concerns": [
    "Missing information or red flags",
    "Potential mismatches"
  ],
  "summary": {
    "role": "job title or 'Not specified'",
    "company": "company name or 'Not specified'",
    "location": "location/remote info or 'Not specified'",
    "salary_range": "salary if mentioned or 'Not specified'"
  },
  "analysis": "Your bottom-line take: should they pursue this opportunity and why?"
}`;

export async function analyzeHackerNewsJob(
  comment: string,
  resume: string, 
  preferences: string
): Promise<JobAnalysis> {
  
  const prompt = hackerNewsJobPrompt(resume, preferences, comment);

  try {
    console.log('Analyzing HackerNews job comment...');
    
    const content = await runPromptWithTogetherAI(prompt);
    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }

    const analysis = JSON.parse(jsonMatch[0]) as JobAnalysis;
    
    // Validate the response
    if (!analysis.recommendation || !analysis.fitScore || !analysis.confidence) {
      throw new Error("Invalid analysis format from AI");
    }

    // Ensure scores are within valid range
    analysis.fitScore = Math.max(1, Math.min(5, analysis.fitScore));
    analysis.confidence = Math.max(1, Math.min(5, analysis.confidence));

    // Ensure required arrays exist
    if (!analysis.why_good_fit) analysis.why_good_fit = [];
    if (!analysis.potential_concerns) analysis.potential_concerns = [];
    
    // Ensure summary object exists with defaults
    if (!analysis.summary) {
      analysis.summary = {
        role: 'Not specified',
        company: 'Not specified',
        location: 'Not specified',
        salary_range: 'Not specified',
      };
    }

    // Provide fallbacks for new fields
    if (!analysis.job_summary) analysis.job_summary = analysis.analysis || 'Job summary not available';
    if (!analysis.fit_summary) analysis.fit_summary = 'Fit analysis not available';

    console.log(`HackerNews job analysis complete: ${analysis.recommendation} (fit: ${analysis.fitScore}/5, confidence: ${analysis.confidence}/5)`);
    
    return analysis;

  } catch (error) {
    console.error('Error analyzing HackerNews job:', error);
    
    // Return a fallback analysis
    return {
      recommendation: 'maybe',
      fitScore: 3,
      company_summary: 'Company summary not available due to AI service error',
      confidence: 1,
      job_summary: 'Analysis unavailable due to AI service error',
      fit_summary: 'Could not analyze job fit due to technical issues',
      why_good_fit: [],
      potential_concerns: ['AI analysis failed - manual review recommended'],
      summary: {
        role: 'Not specified',
        company: 'Not specified',
        location: 'Not specified',
        salary_range: 'Not specified',
      },
      analysis: 'Could not analyze job fit due to technical issues. Manual review recommended.'
    };
  }
}