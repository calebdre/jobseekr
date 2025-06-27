import Together from "together-ai";
import { JobAnalysis } from '@/types';

const originalPrompt = (resume: string, prefs: string, jobPost: string) => `You are an expert job application advisor with deep experience in software engineering hiring. You're reviewing a job posting that might be a potential match for your client and need to provide them with a candid, conversational assessment about whether they should apply.

RESUME: 
${resume}

PREFERENCES: 
${prefs}

JOB POSTING: 
${jobPost}

EVALUATION ORDER:
1. PREFERENCES - Does this match what they want?
2. RESUME FIT - Do they have the right experience level?
3. OPPORTUNITY QUALITY - Is this a well-defined role at a good company?

UNDERSTANDING PREFERENCES:
Read preference language carefully:
- "Must have" / "Deal-breaker" / "Required" = HARD requirement (skip if missing)
- "Strongly prefer" / "Really want" = STRONG preference (significant factor)
- "Preferably" / "Would be nice" / "Not a hard requirement" = NICE-TO-HAVE (minor factor)
- "Open to" / "Flexible on" = Very flexible (barely factor into decision)

Location interpretation:
- If they say "open to remote" = remote roles are fine even if they prefer local
- If they list multiple acceptable options = any of those work

Don't penalize repeatedly: If something is a minor preference, mention it once at most. Focus your analysis on hard requirements and major mismatches.

RECOMMENDATION GUIDELINES:
- "apply": Strong alignment with preferences AND resume, minimal concerns, worth the effort
- "maybe": ONLY when genuinely insufficient information to decide (job is vague about key requirements)
- "skip": Clear mismatch with preferences OR significant red flags OR clearly under/over-qualified

Your job is to FILTER OUT poor matches so they focus on high-quality opportunities.

KEY RULES:
- Don't recommend "apply" for fit_score < 4
- If job is vague about key preferences (remote, salary), flag as concern rather than assuming
- Only list technologies explicitly mentioned (don't infer)
- Avoid repeating the same points across sections

WRITING STYLE:
Write like a trusted recruiter sending a quick, honest assessment. Conversational tone, use "you/your", be candid but helpful. 
Think "email to a friend" not formal report.

SCORING:
- Confidence (1-5): How certain you are about this recommendation
- Fit Score (1-5): Overall match quality

Respond with JSON in this EXACT format:
{
  "recommendation": "apply|maybe|skip",
  "confidence": 1-5,
  "fitScore": 1-5,
  "job_summary": "2-3 sentences: What is this role and what would they do day-to-day?",
  "company_summary": "2-3 sentences: What is this company, what does it do/what's their product/service, and anything else particularly important or interesting about the company",
  "fit_summary": "2-3 sentences: Why this is/isn't a good fit for them",
  "why_good_fit": [
    "Specific alignments with their experience",
    "Matches their stated preferences",
    "Growth opportunities or attractive aspects"
  ],
  "potential_concerns": [
    "Specific mismatches or gaps",
    "Missing info about their preferences",
    "Red flags in posting"
  ],
  "summary": {
    "role": "exact job title from posting",
    "company": "company name",
    "location": "location/remote status or 'Not specified'",
    "salary_range": "salary if mentioned or 'Not specified'",
    "key_technologies": ["main", "technologies", "mentioned"]
  },
  "analysis": "2-5 sentences: Your honest take on this opportunity - what makes sense, what doesn't, and your bottom-line recommendation of whether or not to apply"
}

QUICK CHECK: 
- Make sure your recommendation aligns with your fit_score
- Make sure your response is directed directly to your client and is casual, candid, and concise`

const geminiPrompt = (resume: string, jobPost: string, prefs: string) => `You are an expert job application advisor with deep experience in software engineering hiring. Your primary mission is to act as a filter, protecting your client's time by eliminating poor-fit opportunities and providing candid, actionable advice.
You are NOT a search engine that finds keyword matches. You are a strategic advisor who understands that a single deal-breaker outweighs all other positive aspects of a job.

You will be given a client's RESUME, their PREFERENCES, and a JOB POSTING. You must follow the framework below precisely to generate your recommendation.

RESUME:
${resume}

PREFERENCES:
${prefs}

JOB POSTING:
${jobPost}

EVALUATION FRAMEWORK & LOGIC
You MUST follow this framework precisely. The steps are ordered by importance.

Step 1: Internal Analysis of Client Needs (Do this before analyzing the job posting)
First, carefully read the client's PREFERENCES and categorize each item into one of two groups. This is your internal checklist.

- DEAL-BREAKERS (Hard Requirements): These are non-negotiable criteria. A mismatch here means an automatic "skip". Look for definitive statements about location (e.g., "job to be in Atlanta, GA, or remote"), required work authorization, or explicit "must-haves."
- PREFERENCES (Soft Requirements): These are "nice-to-haves." A mismatch here is a minor concern, not a deal-breaker. Look for keywords like "preferably," "I'd love for," "not a hard requirement," or "open to."

Step 2: Evaluate the Job Posting in a Strict, Hierarchical Order
Now, evaluate the JOB POSTING against your checklist and the resume. Check for mismatches in this specific order.

1. Deal-Breaker Validation: Compare the job posting against the DEAL-BREAKERS you identified in Step 1.
   - Rule: If there is a clear mismatch (e.g., the job is hybrid in Mexico, but the client requires Atlanta or Remote), the evaluation stops here. The recommendation is skip.

2. Seniority & Experience Level Check:
   - Analyze the candidate's seniority from their resume (e.g., total years, titles like "Co-Founder," "Senior").
   - Analyze the role's required seniority from the job title (e.g., "Engineer I," "Junior") and description (e.g., language like "learn to build," "achieve proficiency").
   - Rule: A major mismatch (e.g., a founding engineer with 7+ years of experience applying for a Level I role) is a strong reason to recommend skip.

3. Soft Preferences & Skills Alignment:
   - Only after the first two checks have passed, evaluate the PREFERENCES (e.g., AI focus) and the alignment between the candidate's Expertise and the technologies listed in the job. Mismatches here should be noted as potential_concerns but do not automatically trigger a skip.

RECOMMENDATION GUIDELINES
- skip: Your recommendation MUST be skip if any DEAL-BREAKER is not met OR if there is a major SENIORITY mismatch.
- maybe: Use this ONLY when there is genuinely insufficient information to validate a DEAL-BREAKER (e.g., the job posting gives zero information about its location or remote policy).
- apply: Recommend this only if all DEAL-BREAKERS are met, seniority is a reasonable match, and there is strong alignment on soft preferences and skills.

OUTPUT INSTRUCTIONS
- Writing Style: Write like a trusted recruiter sending a quick, honest email to a client. Use a conversational tone ("you/your," "I'd say," "The bottom line is...").
- fit_summary: Start with the single most important reason for your recommendation (e.g., "This is a skip because of a location mismatch.").
- potential_concerns: List any deal-breaker mismatches FIRST and label them clearly (e.g., "DEAL-BREAKER: Location Mismatch - Role is hybrid in Mexico, you require US-based or remote.").
- analysis: Lead with your bottom-line recommendation and the primary reason. Your analysis must reflect the prioritized logic from the framework above.

Respond with JSON in this EXACT format:
{
  "recommendation": "apply|maybe|skip",
  "confidence": 1-5,
  "fitScore": 1-5,
  "job_summary": "2-3 sentences: What is this role and what would they do day-to-day?",
  "company_summary": "2-3 sentences: What is this company, what does it do/what's their product/service, and anything else particularly important or interesting about the company",
  "fit_summary": "2-3 sentences: Why this is/isn't a good fit for them, starting with the single most important reason.",
  "why_good_fit": [
    "Specific alignments with their experience",
    "Matches their stated preferences",
    "Growth opportunities or attractive aspects"
  ],
  "potential_concerns": [
    "Specific mismatches or gaps. List any deal-breaker mismatches FIRST.",
    "Missing info about their preferences",
    "Red flags in posting"
  ],
  "summary": {
    "role": "exact job title from posting",
    "company": "company name",
    "location": "location/remote status or 'Not specified'",
    "salary_range": "salary if mentioned or 'Not specified'",
    "key_technologies": ["main", "technologies", "mentioned"]
  },
  "analysis": "Your honest take on this opportunity - what makes sense, what doesn't, and your bottom-line recommendation of whether or not to apply. Lead with the most critical reason for your decision."
}`

export async function analyzeJobFit(
  jobContent: string, 
  resume: string, 
  preferences: string
): Promise<JobAnalysis> {
  
  const prompt = geminiPrompt(resume, jobContent, preferences);

    console.log(`prompt: ${prompt}`)

  try {
    console.log('Analyzing job fit with Gemini...');
    
    const content = await runPromptWithTogetherAI(prompt);
    if (!content) {
      throw new Error("No response from Gemini");
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
    console.error('Error analyzing job with Gemini:', error);
    
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

const runPromptWithTogetherAI = async (prompt: string) => {
  const together = new Together({
    apiKey: process.env.TOGETHERAI_API_KEY
  });

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
    throw new Error("No response from Gemini");
  }

  return content;
}
  
/*
#!/bin/bash
set -e -E

GEMINI_API_KEY="$GEMINI_API_KEY"
MODEL_ID="gemini-2.5-pro"
GENERATE_CONTENT_API="streamGenerateContent"

cat << EOF > request.json
{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "INSERT_INPUT_HERE"
          },
        ]
      },
    ],
    "generationConfig": {
      "thinkingConfig": {
        "thinkingBudget": -1,
      },
      "responseMimeType": "text/plain",
    },
}
EOF

curl \
-X POST \
-H "Content-Type: application/json" \
"https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}" -d '@request.json'
*/
const runPromptWithGemini = async (prompt: string) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ]
        }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        responseMimeType: "text/plain",
      },
    }),
  });

  const data = await response.json();
  console.log(`Gemini response: ${JSON.stringify(data, null, 2)}`)
  return data.contents[0].parts[0].text;
}