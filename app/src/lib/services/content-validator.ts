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

export async function extractJobContent(content: string): Promise<ContentValidationResult> {
  const together = new Together({
    apiKey: process.env.TOGETHERAI_API_KEY
  });

  const prompt = `Analyze this webpage content and extract ALL relevant job information. If this is not a valid individual job posting, classify it appropriately.

CONTENT:
${content.substring(0, 4000)} ${content.length > 4000 ? '...[truncated]' : ''}

CRITICAL INSTRUCTIONS:
1. First determine if this is an INDIVIDUAL job posting, LISTING page, or contains NO job info
2. If it's an INDIVIDUAL job posting, extract ALL information below in this exact format
3. If not, respond with just the classification: "LISTING" or "NONE"

EXTRACTION RULES:
- COPY EXACT LANGUAGE from the job posting - do NOT paraphrase or rewrite
- Use the EXACT WORDS, phrases, and terminology that appear on the page
- Preserve the company's tone, style, and specific language choices
- If they say "rock star developer" - copy "rock star developer", don't change to "excellent developer"
- If they list "React, Node.js, TypeScript" - copy exactly, don't summarize as "JavaScript technologies"
- Maintain bullet points, lists, and formatting structure when possible
- Only organize information into sections - do NOT change the actual content

If this is an INDIVIDUAL job posting, extract:

=== JOB BASICS ===
Job Title: [copy exact title from page]
Company: [copy exact company name]
Location: [copy exact location text - could be city, "Remote", "Hybrid", etc.]
Salary: [copy exact salary/compensation text or "Not specified"]
Employment Type: [copy exact employment type or infer from context]
Experience Level: [copy exact experience requirement or infer from context]

=== JOB DESCRIPTION ===
Role Overview: [copy exact role summary/overview text from page]
Key Responsibilities: [copy exact responsibilities text - preserve bullets/lists]
Day-to-Day Activities: [copy exact day-to-day description if mentioned]

=== REQUIREMENTS ===
Required Skills: [copy exact required skills text - preserve lists/bullets]
Required Experience: [copy exact experience requirements]
Required Education: [copy exact education requirements]
Must-Have Qualifications: [copy exact must-have qualifications]

=== PREFERRED QUALIFICATIONS ===
Preferred Skills: [copy exact preferred/nice-to-have skills]
Preferred Experience: [copy exact preferred experience]
Preferred Background: [copy exact preferred background text]

=== COMPANY INFO ===
Company Description: [copy exact company description/about text]
Company Size: [copy exact company size info or team size mentions]
Industry: [copy exact industry description or infer from company description]
Company Culture: [copy exact culture/values text]
Mission/Vision: [copy exact mission/vision statements]

=== COMPENSATION & BENEFITS ===
Base Salary: [copy exact salary details]
Bonus/Equity: [copy exact bonus/equity text]
Health Benefits: [copy exact health benefits text]
Time Off: [copy exact PTO/vacation policy text]
Professional Development: [copy exact learning/development benefits]
Work-Life Balance: [copy exact work-life balance mentions]
Other Perks: [copy exact other perks/benefits listed]

=== WORK ENVIRONMENT ===
Remote Policy: [copy exact remote work policy text]
Office Location: [copy exact office location/address]
Travel Requirements: [copy exact travel requirement text]
Work Schedule: [copy exact schedule/hours information]
Team Structure: [copy exact team structure/size info]
Tools & Technology: [copy exact tech stack/tools mentioned]

=== GROWTH & OPPORTUNITIES ===
Career Advancement: [copy exact advancement/growth text]
Learning Opportunities: [copy exact learning opportunity text]
Project Variety: [copy exact project variety/type descriptions]
Leadership Opportunities: [copy exact leadership opportunity text]

=== APPLICATION INFO ===
Application Process: [copy exact application instructions]
Application Deadline: [copy exact deadline or "No deadline specified"]
Contact Information: [copy exact contact details]
Required Application Materials: [copy exact application requirements]

=== RED FLAGS / CONCERNS ===
Potential Issues: [copy exact concerning language verbatim]
Unclear Aspects: [note vague sections but quote the actual vague text]

REMEMBER: Your job is to EXTRACT and ORGANIZE, not to REWRITE or IMPROVE. Copy the company's exact language, even if it seems unprofessional, unclear, or poorly written. If information is not available, write "Not specified" or "Not mentioned".`;

  try {
    console.log('Extracting structured job content...');
    
    const response = await together.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      temperature: 0.1,
      max_tokens: 2000
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Check if it's just a classification (LISTING or NONE)
    const upperResponse = aiResponse.toUpperCase();
    if (upperResponse === 'LISTING') {
      return {
        isValidJobPosting: false,
        postingType: JobPostingType.LISTING,
        content: ''
      };
    }
    
    if (upperResponse === 'NONE') {
      return {
        isValidJobPosting: false,
        postingType: JobPostingType.NONE,
        content: ''
      };
    }

    // If we got structured content, it's an individual job posting
    console.log('Successfully extracted structured job content');
    
    return {
      isValidJobPosting: true,
      postingType: JobPostingType.INDIVIDUAL,
      content: aiResponse
    };

  } catch (error) {
    console.error('Error extracting job content:', error);
    
    // Fallback: assume it's not a valid individual job posting
    return {
      isValidJobPosting: false,
      postingType: JobPostingType.NONE,
      content: ''
    };
  }
}