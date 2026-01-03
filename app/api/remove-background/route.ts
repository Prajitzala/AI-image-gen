import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { config } from '@/lib/config';

// Helper function to clean base64 string (remove data URL prefix if present)
function cleanBase64(base64String: string): string {
  return base64String.replace(/^data:image\/[a-z]+;base64,/, '');
}

// Helper function to validate base64 string
function isValidBase64(str: string): boolean {
  try {
    const cleaned = cleanBase64(str);
    return /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) && cleaned.length > 0;
  } catch {
    return false;
  }
}

// Initialize Google GenAI client
// Supports both API key mode and Vertex AI mode
function initializeGenAI() {
  // Check if Vertex AI mode is enabled (requires Google Cloud Project)
  const useVertexAI = process.env.GOOGLE_CLOUD_PROJECT && 
                      process.env.GOOGLE_CLOUD_LOCATION;
  
  if (useVertexAI) {
    // Vertex AI mode - requires Google Cloud Project setup
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
  } else {
    // API key mode (current setup)
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Either GOOGLE_AI_API_KEY or GOOGLE_CLOUD_PROJECT must be configured');
    }
    return new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    });
  }
}

// Get the model name based on the mode
function getModelName(): string {
  const useVertexAI = process.env.GOOGLE_CLOUD_PROJECT && 
                      process.env.GOOGLE_CLOUD_LOCATION;
  
  if (useVertexAI) {
    // Vertex AI uses full resource path
    const project = process.env.GOOGLE_CLOUD_PROJECT!;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    return `projects/${project}/locations/${location}/publishers/google/models/${config.googleModel}`;
  } else {
    // API key mode uses just the model name
    return config.googleModel;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ai = initializeGenAI();
    const modelName = getModelName();

    const body = await request.json();
    
    // Handle both old format (string) and new format (object with data and mimeType)
    const imageInput = body.image;
    const backgroundType = body.backgroundType || 'transparent'; // 'transparent', 'white', or 'custom'
    const customBackgroundColor = body.customBackgroundColor; // Hex color for custom background

    // Helper to normalize image input
    const normalizeImageInput = (
      input: string | { data: string; mimeType: string }
    ): { data: string; mimeType: string } => {
      if (typeof input === 'string') {
        return {
          data: input,
          mimeType: 'image/jpeg',
        };
      }
      return {
        data: input.data,
        mimeType: input.mimeType || 'image/jpeg',
      };
    };

    // Normalize input
    const image = normalizeImageInput(imageInput);

    // Validate required input
    if (!image.data) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Validate base64 format
    if (!isValidBase64(image.data)) {
      return NextResponse.json(
        { error: 'Invalid image format. Please upload a valid image.' },
        { status: 400 }
      );
    }

    // Validate MIME types
    const supportedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validateMimeType = (mimeType: string): string => {
      const normalized = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
      if (!supportedMimeTypes.includes(normalized)) {
        return 'image/jpeg';
      }
      return normalized;
    };

    const validatedMimeType = validateMimeType(image.mimeType);

    // Construct the prompt based on background type
    let prompt: string;
    switch (backgroundType) {
      case 'transparent':
        prompt = 'Remove the background from this image completely, making it transparent. Keep only the main subject(s) in the foreground. The output should have a transparent background (PNG format with alpha channel).';
        break;
      case 'white':
        prompt = 'Remove the background from this image and replace it with a solid white background (#FFFFFF). Keep only the main subject(s) in the foreground.';
        break;
      case 'custom':
        const bgColor = customBackgroundColor || '#FFFFFF';
        prompt = `Remove the background from this image and replace it with a solid ${bgColor} background. Keep only the main subject(s) in the foreground.`;
        break;
      default:
        prompt = 'Remove the background from this image completely, making it transparent. Keep only the main subject(s) in the foreground.';
    }

    // Build contents array with image and text
    const contents: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
      {
        inlineData: {
          data: cleanBase64(image.data),
          mimeType: validatedMimeType,
        },
      },
      { text: prompt },
    ];

    // Call Google GenAI API
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          responseModalities: ['IMAGE'], // Request image response
        },
      });
    } catch (apiError: any) {
      const errorMessage = apiError?.message || 'Unknown API error';

      // Handle specific error types
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
          { error: 'API permission denied. Please check your API key or Google Cloud credentials configuration.' },
          { status: 403 }
        );
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
        return NextResponse.json(
          { error: 'Request timed out. The API is taking too long to respond. Please try again.' },
          { status: 504 }
        );
      }

      console.error('Google GenAI API error:', apiError);
      return NextResponse.json(
        { error: `API error: ${errorMessage}. Please try again later.` },
        { status: 500 }
      );
    }

    // Extract image from response
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

    // Try to extract image from parts
    if (content && content.parts) {
      for (const part of content.parts) {
        // Check for text first (might contain URL)
        if (part.text) {
          const urlMatch = part.text.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            imageUrl = urlMatch[0];
            break;
          }
        }
        // Check for inlineData (image data)
        else if (part.inlineData) {
          const imageData = part.inlineData.data;
          // Use PNG mime type for transparent backgrounds, or preserve original
          const outputMimeType = backgroundType === 'transparent' 
            ? 'image/png' 
            : part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${outputMimeType};base64,${imageData}`;
          break;
        }
      }
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('Unexpected output format:', JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: 'Failed to remove background - the API response did not contain an image. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      imageUrl,
      backgroundType,
      message: 'Background removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing background:', error);

    const errorMessage = error?.message || 'Unknown error';

    // Handle JSON parsing errors
    if (error instanceof SyntaxError || errorMessage.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid request format. Please try again.' },
        { status: 400 }
      );
    }

    // Handle initialization errors
    if (errorMessage.includes('must be configured')) {
      return NextResponse.json(
        { error: 'API configuration error. Please check your environment variables.' },
        { status: 500 }
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
      { error: errorMessage || 'Failed to remove background. Please try again.' },
      { status: 500 }
    );
  }
}
