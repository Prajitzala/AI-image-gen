import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { config } from '@/lib/config';

// Initialize Google GenAI
const ai = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_AI_API_KEY || '' 
});

// Replicate code (commented out)
// import Replicate from 'replicate';
// const replicate = new Replicate({
//   auth: process.env.REPLICATE_API_TOKEN,
// });

// Helper function to clean base64 string (remove data URL prefix if present)
function cleanBase64(base64String: string): string {
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  return base64String.replace(/^data:image\/[a-z]+;base64,/, '');
}

// Helper function to validate base64 string
function isValidBase64(str: string): boolean {
  try {
    // Check if it's a valid base64 string
    const cleaned = cleanBase64(str);
    return /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) && cleaned.length > 0;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate API token
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_AI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    // Handle both old format (string) and new format (object with data and mimeType)
    const topImageInput = body.topImage;
    const bottomImageInput = body.bottomImage;
    const personImageInput = body.personImage;

    // Helper to normalize image input (support both old string format and new object format)
    const normalizeImageInput = (input: string | { data: string; mimeType: string }): { data: string; mimeType: string } => {
      if (typeof input === 'string') {
        // Old format: just base64 string, default to JPEG for backward compatibility
        return {
          data: input,
          mimeType: 'image/jpeg',
        };
      }
      // New format: object with data and mimeType
      return {
        data: input.data,
        mimeType: input.mimeType || 'image/jpeg',
      };
    };

    // Normalize inputs
    const topImage = normalizeImageInput(topImageInput);
    const bottomImage = normalizeImageInput(bottomImageInput);
    const personImage = personImageInput ? normalizeImageInput(personImageInput) : null;

    // Validate required inputs
    if (!topImage.data || !bottomImage.data) {
      return NextResponse.json(
        { error: 'Top and bottom images are required' },
        { status: 400 }
      );
    }

    // Validate base64 format
    if (!isValidBase64(topImage.data)) {
      return NextResponse.json(
        { error: 'Invalid top image format. Please upload a valid image.' },
        { status: 400 }
      );
    }

    if (!isValidBase64(bottomImage.data)) {
      return NextResponse.json(
        { error: 'Invalid bottom image format. Please upload a valid image.' },
        { status: 400 }
      );
    }

    if (personImage && !isValidBase64(personImage.data)) {
      return NextResponse.json(
        { error: 'Invalid person image format. Please upload a valid image.' },
        { status: 400 }
      );
    }

    // Validate MIME types (only allow supported formats)
    const supportedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validateMimeType = (mimeType: string): string => {
      // Normalize 'image/jpg' to 'image/jpeg'
      const normalized = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
      if (!supportedMimeTypes.includes(normalized)) {
        return 'image/jpeg'; // Default to JPEG if unsupported
      }
      return normalized;
    };

    // Construct the prompt
    const prompt = `Create a new image by combining the elements from the provided images. Take the top clothing item from image 1 and the bottom clothing item from image 2, and place them naturally onto the body in image 3 so it looks like the person is wearing the selected outfit. Fit to body shape and pose, preserve garment proportions and textures, match lighting and shadows, handle occlusion by hair and arms. CRITICAL: The background must be completely white (#FFFFFF) - do not use black, transparent, or any other background color. Replace any existing background with solid white. Do not change the person identity or add accessories.`;

    // Build contents array with images and text for new SDK
    const contents: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [];
    
    // Add person image first if provided (image 3)
    if (personImage) {
      contents.push({
        inlineData: {
          data: cleanBase64(personImage.data),
          mimeType: validateMimeType(personImage.mimeType),
        },
      });
    }
    
    // Add top image (image 1)
    contents.push({
      inlineData: {
        data: cleanBase64(topImage.data),
        mimeType: validateMimeType(topImage.mimeType),
      },
    });
    
    // Add bottom image (image 2)
    contents.push({
      inlineData: {
        data: cleanBase64(bottomImage.data),
        mimeType: validateMimeType(bottomImage.mimeType),
      },
    });
    
    // Add prompt as text
    contents.push({ text: prompt });

    // Call Google GenAI API using the new SDK
    let response;
    try {
      response = await ai.models.generateContent({
        model: config.googleModel,
        contents: contents,
        config: {
          responseModalities: ['IMAGE'], // Request image response
        },
      });
    } catch (apiError: any) {
      // Handle specific Google API errors
      const errorMessage = apiError?.message || 'Unknown API error';
      
      // Check for common error types
      if (errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later or check your Google AI API quota.' },
          { status: 429 }
        );
      }
      
      if (errorMessage.includes('safety') || errorMessage.includes('SAFETY')) {
        return NextResponse.json(
          { error: 'Content was blocked by safety filters. Please try different images.' },
          { status: 400 }
        );
      }
      
      if (errorMessage.includes('invalid') || errorMessage.includes('INVALID_ARGUMENT')) {
        return NextResponse.json(
          { error: 'Invalid request. Please check your images and try again.' },
          { status: 400 }
        );
      }
      
      if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
        return NextResponse.json(
          { error: 'API permission denied. Please check your API key configuration.' },
          { status: 403 }
        );
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
        return NextResponse.json(
          { error: 'Request timed out. The API is taking too long to respond. Please try again.' },
          { status: 504 }
        );
      }
      
      // Generic API error
      console.error('Google GenAI API error:', apiError);
      return NextResponse.json(
        { error: `API error: ${errorMessage}. Please try again later.` },
        { status: 500 }
      );
    }
    
    // Extract image from response (matching reference pattern)
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      console.error('No candidates in response:', response);
      return NextResponse.json(
        { error: 'No response from AI model. The model may be unavailable or the request was blocked. Please try again.' },
        { status: 500 }
      );
    }
    
    // Check if candidate was blocked
    if (candidates[0].finishReason === 'SAFETY') {
      return NextResponse.json(
        { error: 'Content was blocked by safety filters. Please try different images.' },
        { status: 400 }
      );
    }
    
    // Check if candidate was stopped for other reasons
    if (candidates[0].finishReason && candidates[0].finishReason !== 'STOP') {
      console.warn('Unexpected finish reason:', candidates[0].finishReason);
    }
    
    // Check if response contains image data
    const content = candidates[0].content;
    let imageUrl: string | null = null;
    
    // Try to extract image from parts (matching reference pattern)
    if (content && content.parts) {
      for (const part of content.parts) {
        // Check for text first (as in reference)
        if (part.text) {
          // If response contains a URL in text
          const urlMatch = part.text.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            imageUrl = urlMatch[0];
            break;
          }
        } 
        // Check for inlineData (image data) - matching reference pattern
        else if (part.inlineData) {
          // Response contains base64 image data
          const imageData = part.inlineData.data;
          imageUrl = `data:${part.inlineData.mimeType};base64,${imageData}`;
          break;
        }
      }
    }
    
    // Replicate code (commented out)
    // const output = await replicate.run(config.replicateModel as `${string}/${string}`, {
    //   input: {
    //     prompt: prompt,
    //     image_input: images,
    //     aspect_ratio: '1:1',
    //     output_format: 'png',
    //   },
    // });
    // const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('Unexpected output format:', JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: 'Failed to generate outfit image - the API response did not contain an image. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Error generating outfit:', error);
    
    // Provide more specific error messages
    const errorMessage = error?.message || 'Unknown error';
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError || errorMessage.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid request format. Please try again.' },
        { status: 400 }
      );
    }
    
    // Handle network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage || 'Failed to generate outfit. Please try again.' },
      { status: 500 }
    );
  }
}

