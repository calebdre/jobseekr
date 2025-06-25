import Together from "together-ai";

interface JobAnalysis {
  recommendation: 'apply' | 'maybe' | 'skip';
  fitScore: number; // 1-5
  confidence: number; // 1-5
  summary: string;
  analysis: string;
}

export async function analyzeJobFit(
  jobContent: string, 
  resume: string, 
  preferences: string
): Promise<JobAnalysis> {
  const together = new Together({
    apiKey: process.env.TOGETHERAI_API_KEY
  });

  const prompt = `You are a job application assistant. Analyze this job posting against the candidate's resume and preferences.

RESUME:
${resume}

PREFERENCES:
${preferences}

JOB POSTING:
${jobContent}

Analyze the job fit and respond with JSON in this exact format:
{
  "recommendation": "apply|maybe|skip",
  "fitScore": 1-5,
  "confidence": 1-5,
  "summary": "Brief 1-2 sentence summary of the role",
  "analysis": "Detailed analysis of fit, strengths, and concerns"
}

Consider:
- Technical skill alignment
- Experience level match
- Location/remote preferences
- Salary expectations (if mentioned)
- Company culture fit
- Growth opportunities

Recommendation guidelines:
- "apply": Strong fit (80%+ match)
- "maybe": Moderate fit (50-79% match)  
- "skip": Poor fit (<50% match)`;

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

    console.log(`Job analysis complete: ${analysis.recommendation} (fit: ${analysis.fitScore}/5, confidence: ${analysis.confidence}/5)`);
    
    return analysis;

  } catch (error) {
    console.error('Error analyzing job with Together AI:', error);
    
    // Return a fallback analysis
    return {
      recommendation: 'maybe',
      fitScore: 3,
      confidence: 1,
      summary: 'Analysis unavailable due to AI service error',
      analysis: 'Could not analyze job fit due to technical issues. Manual review recommended.'
    };
  }
}