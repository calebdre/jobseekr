import Together from "together-ai";
import { JobAnalysis } from '@/types';

export async function analyzeJobFit(
  jobContent: string, 
  resume: string, 
  preferences: string
): Promise<JobAnalysis> {
  const together = new Together({
    apiKey: process.env.TOGETHERAI_API_KEY
  });

  const prompt = `You are an expert job application advisor with deep experience in software engineering hiring. Your job is to provide decisive, actionable recommendations about whether a candidate should apply to specific job postings.

RESUME:
${resume}

PREFERENCES:
${preferences}

JOB POSTING:
${jobContent}

RECOMMENDATION GUIDELINES (CRITICAL - Follow these exactly):
- "apply": Strong alignment with preferences AND resume, minimal concerns, worth the application effort
- "maybe": ONLY when there's genuinely insufficient information to make a clear decision (job is vague about key requirements)
- "skip": Clear mismatch with preferences OR significant red flags OR candidate clearly under/over-qualified

Your primary job is to FILTER OUT poor matches so the candidate focuses on high-quality opportunities.

EVALUATION PRIORITY ORDER:
1. PREFERENCES (primary filter) - Does this job meet the user's stated requirements?
2. RESUME FIT - Does the candidate's experience match the role level and skills?
3. OPPORTUNITY QUALITY - Is this a well-defined role at a reasonable company?

If the job posting is vague about something important in preferences (e.g., remote work, salary range), FLAG this as a concern rather than assuming.

Respond with JSON in this EXACT format:
{
  "recommendation": "apply|maybe|skip",
  "confidence": 1-5,
  "fitScore": 1-5,
  "job_summary": "2-3 sentences: What is this role? What will you do day-to-day? How does it impact the company?",
  "fit_summary": "2-3 sentences: Why is this a good/poor fit based on resume and preferences?",
  "why_good_fit": [
    "Specific alignment with experience/skills",
    "Matches stated preferences",
    "Growth opportunity or attractive aspect"
  ],
  "potential_concerns": [
    "Specific mismatches or gaps",
    "Missing information about preferences",
    "Red flags in posting or requirements"
  ],
  "summary": {
    "role": "exact job title from posting",
    "company": "company name",
    "location": "location/remote status or 'Not specified'",
    "salary_range": "salary if mentioned or 'Not specified'",
    "key_technologies": ["main", "technologies", "mentioned"]
  },
  "analysis": "Detailed analysis of fit, strengths, and concerns"
}

ANALYSIS REQUIREMENTS:
- Extract key technologies/skills mentioned (don't infer what's not explicitly stated)
- Identify if remote work is clearly stated vs assumed vs unclear
- Note if salary range is provided or missing
- Flag requirements that seem unrealistic (e.g., "10 years experience, entry level salary")
- Assess if job description is well-written and professional
- Consider company reputation if you recognize the name

SCORING GUIDE:
Confidence (1-5): How certain are you about this recommendation?
- 5: All key information is clear, obvious decision
- 3: Some ambiguity but can make reasonable judgment
- 1: Job posting is very vague or confusing

Fit Score (1-5): Overall match quality
- 5: Excellent alignment with both resume and preferences
- 4: Good match with minor gaps or concerns
- 3: Decent fit but notable mismatches
- 2: Poor fit with significant issues
- 1: Major misalignment, definitely not suitable

FINAL CHECKS:
- Does your recommendation align with the fit_score? (Don't recommend "apply" for fit_score < 4)
- Are your "why_good_fit" reasons specific and factual?
- Do your "potential_concerns" address real issues, not hypotheticals?
- Is your job_summary informative enough for someone who hasn't read the full posting?`;

  try {
    console.log('Analyzing job fit with Together AI...');
    
    const response = await together.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Together AI");
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
        key_technologies: []
      };
    }

    // Provide fallbacks for new fields
    if (!analysis.job_summary) analysis.job_summary = analysis.analysis || 'Job summary not available';
    if (!analysis.fit_summary) analysis.fit_summary = 'Fit analysis not available';

    console.log(`Job analysis complete: ${analysis.recommendation} (fit: ${analysis.fitScore}/5, confidence: ${analysis.confidence}/5)`);
    
    return analysis;

  } catch (error) {
    console.error('Error analyzing job with Together AI:', error);
    
    // Return a fallback analysis
    return {
      recommendation: 'maybe',
      fitScore: 3,
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
        key_technologies: []
      },
      analysis: 'Could not analyze job fit due to technical issues. Manual review recommended.'
    };
  }
}