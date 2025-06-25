import Together from "together-ai";

export enum JobPostingType {
  INDIVIDUAL = 'INDIVIDUAL',
  LISTING = 'LISTING', 
  NONE = 'NONE'
}

interface ContentValidationResult {
  isValidJobPosting: boolean;
  postingType: JobPostingType;
  content: string;
}

export async function validateJobContent(url: string, content: string): Promise<ContentValidationResult> {
  const together = new Together({
    apiKey: process.env.TOGETHERAI_API_KEY
  });

  const prompt = `Analyze this webpage content and determine what type of job-related information it contains.

URL: ${url}

CONTENT:
${content.substring(0, 3000)} ${content.length > 3000 ? '...[truncated]' : ''}

Classify this content into ONE of these categories:

1. INDIVIDUAL JOB POSTING - Contains:
   - Details about ONE specific job role
   - Job description, responsibilities, requirements  
   - Information about applying for THIS specific position
   - Company information for THIS role

2. JOB LISTING PAGE - Contains:
   - Multiple job openings
   - Links to various positions
   - General career information
   - "Browse jobs", "See all openings", "Filter positions" type content

3. NO JOB INFO - Contains:
   - No job-related information
   - Error pages, redirects, login pages
   - General company info without job details
   - Broken/empty/irrelevant content

Respond with ONLY the classification: INDIVIDUAL, LISTING, or NONE`;

  try {
    console.log(`Validating job content type for: ${url}`);
    
    const response = await together.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      temperature: 0.1,
      max_tokens: 10
    });

    const aiResponse = response.choices[0]?.message?.content?.trim().toUpperCase();
    
    let postingType: JobPostingType;
    switch (aiResponse) {
      case 'INDIVIDUAL':
        postingType = JobPostingType.INDIVIDUAL;
        break;
      case 'LISTING':
        postingType = JobPostingType.LISTING;
        break;
      case 'NONE':
        postingType = JobPostingType.NONE;
        break;
      default:
        console.warn(`Unexpected AI response: ${aiResponse}, defaulting to NONE`);
        postingType = JobPostingType.NONE;
    }

    const isValidJobPosting = postingType === JobPostingType.INDIVIDUAL;
    
    console.log(`Content validation result: ${postingType} (valid: ${isValidJobPosting})`);
    
    return {
      isValidJobPosting,
      postingType,
      content: isValidJobPosting ? content : ''
    };

  } catch (error) {
    console.error('Error validating job content:', error);
    
    // Fallback: assume it's not a valid individual job posting
    return {
      isValidJobPosting: false,
      postingType: JobPostingType.NONE,
      content: ''
    };
  }
}