import Together from "together-ai";
import { CompletionCreateParams } from "together-ai/resources/chat/completions";

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export const runPromptWithTogetherAI = async (
    prompt: string,
    responseFormat?: CompletionCreateParams.ResponseFormat
) => {
    const together = new Together({
      apiKey: process.env.TOGETHERAI_API_KEY
    });
  
    try {
      const response = await together.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        // model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        model: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
        // model: "lgai/exaone-deep-32b",
        temperature: 0.4,
        max_tokens: 4096,
        response_format: responseFormat,
        
      });
    
      console.log(`Together AI response: ${JSON.stringify(response, null, 2)}`)
      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("No response from Together AI");
      }
      
      // Check if the response indicates a rate limit or error
      if (content.toLowerCase().includes('rate limit') || 
          content.toLowerCase().includes('too many requests') ||
          content.toLowerCase().includes('quota exceeded')) {
        throw new RateLimitError("Rate limited by Together AI", 60);
      }
    
      // for exaone model
      if (content.includes('</thought>')) {
        // remove everything before </thought>
        content = content.split('</thought>')[1];
      }

      if (content.includes('</think>')) {
        // remove everything before </think>
        content = content.split('</think>')[1];
      }
    
      if (content.includes('```json')) {
        content = content.replace('```json', '').replace('```', '');
      }
    
      return content;
      
    } catch (error) {
      // If it's already a RateLimitError, re-throw it
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // Check if the error response indicates rate limiting
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('rate limit') || 
            errorMsg.includes('too many requests') || 
            errorMsg.includes('quota exceeded') ||
            errorMsg.includes('429')) {
          throw new RateLimitError("Rate limited by Together AI API", 60);
        }
      }
      
      // Re-throw other errors as-is
      throw error;
    }
  }
    
  
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