import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compresses and resizes an image to reduce file size
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1024)
 * @param maxHeight - Maximum height in pixels (default: 1024)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Promise with compressed image data and mimeType
 */
export function compressImage(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.85
): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output format - use JPEG for better compression unless it's PNG with transparency
        const isPNG = file.type === 'image/png';
        const outputFormat = isPNG ? 'image/png' : 'image/jpeg';
        const outputQuality = isPNG ? 0.9 : quality; // PNG uses quality for compression level

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve({
                data: base64,
                mimeType: outputFormat,
              });
            };
            reader.onerror = () => reject(new Error('Failed to read compressed image'));
            reader.readAsDataURL(blob);
          },
          outputFormat,
          outputQuality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a File object to a base64 string (uncompressed)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a File object to a compressed base64 string
 * @param file - The image file to convert
 * @param maxWidth - Maximum width in pixels (default: 1024)
 * @param maxHeight - Maximum height in pixels (default: 1024)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Promise with base64 string
 */
export function fileToBase64Compressed(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.85
): Promise<string> {
  return compressImage(file, maxWidth, maxHeight, quality).then((result) => result.data);
}

/**
 * Downloads an image from a URL
 */
export function downloadImage(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validates an image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a PNG, JPG, JPEG, or WEBP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit.',
    };
  }

  return { valid: true };
}

/**
 * Formats file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Converts any image to PNG format with transparent background
 * Removes white/light backgrounds to help AI better understand clothing edges
 */
export function convertToTransparentPNG(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the image onto canvas
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Background removal parameters
        // Adjust these values to fine-tune background removal sensitivity
        const whiteThreshold = 240; // RGB threshold for white (0-255, higher = more sensitive)
        const brightnessThreshold = 0.9; // Overall brightness threshold (0-1)
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // const a = data[i + 3]; // alpha channel

          // Calculate brightness
          const brightness = (r + g + b) / 3 / 255;
          
          // Check if pixel is white/light background
          const isWhite = r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;
          const isLight = brightness > brightnessThreshold;
          
          // Make white/light pixels transparent
          if (isWhite || isLight) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }

        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to PNG base64
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image to PNG'));
              return;
            }
            
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve({
                data: base64,
                mimeType: 'image/png',
              });
            };
            reader.onerror = () => reject(new Error('Failed to read converted image'));
            reader.readAsDataURL(blob);
          },
          'image/png',
          0.95 // Quality (0-1, PNG is lossless but this affects compression)
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts any image to PNG format with white background
 * Removes background and replaces it with white (#FFFFFF) to match final output style
 * This helps AI better understand clothing in consistent context
 * Includes compression to reduce payload size
 */
export function convertToWhiteBackgroundPNG(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024
): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
        }

        // Set canvas size to resized dimensions
        canvas.width = width;
        canvas.height = height;

        // Fill canvas with white background first
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image onto canvas (resized)
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Background removal parameters
        // Adjust these values to fine-tune background removal sensitivity
        const whiteThreshold = 240; // RGB threshold for white (0-255, higher = more sensitive)
        const brightnessThreshold = 0.9; // Overall brightness threshold (0-1)
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // const a = data[i + 3]; // alpha channel

          // Calculate brightness
          const brightness = (r + g + b) / 3 / 255;
          
          // Check if pixel is white/light background
          const isWhite = r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;
          const isLight = brightness > brightnessThreshold;
          
          // Replace white/light background pixels with pure white (#FFFFFF)
          if (isWhite || isLight) {
            data[i] = 255;     // R = 255
            data[i + 1] = 255; // G = 255
            data[i + 2] = 255; // B = 255
            data[i + 3] = 255; // A = 255 (opaque)
          }
        }

        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to PNG base64 with compression
        // Using lower quality for PNG compression (0.8 instead of 0.95) to reduce size
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image to PNG'));
              return;
            }
            
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve({
                data: base64,
                mimeType: 'image/png',
              });
            };
            reader.onerror = () => reject(new Error('Failed to read converted image'));
            reader.readAsDataURL(blob);
          },
          'image/png',
          0.8 // Reduced quality for better compression (PNG compression level)
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Removes background from person photos
 * Uses edge detection and color similarity to identify and remove background
 */
export function removePersonBackground(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the image onto canvas
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Sample edge pixels to determine background color
        const edgeSamples: number[][] = [];
        const sampleSize = Math.min(50, Math.floor(width / 10), Math.floor(height / 10));
        
        // Sample top, bottom, left, right edges
        for (let i = 0; i < sampleSize; i++) {
          // Top edge
          const topX = Math.floor((i / sampleSize) * width);
          const topIdx = (topX + 0 * width) * 4;
          edgeSamples.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
          
          // Bottom edge
          const bottomIdx = (topX + (height - 1) * width) * 4;
          edgeSamples.push([data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2]]);
          
          // Left edge
          const leftY = Math.floor((i / sampleSize) * height);
          const leftIdx = (0 + leftY * width) * 4;
          edgeSamples.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
          
          // Right edge
          const rightIdx = ((width - 1) + leftY * width) * 4;
          edgeSamples.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
        }

        // Calculate average background color from edge samples
        let avgR = 0, avgG = 0, avgB = 0;
        for (const [r, g, b] of edgeSamples) {
          avgR += r;
          avgG += g;
          avgB += b;
        }
        avgR /= edgeSamples.length;
        avgG /= edgeSamples.length;
        avgB /= edgeSamples.length;

        // Color similarity threshold (adjust for sensitivity)
        const colorThreshold = 40; // Lower = more aggressive removal
        const brightnessThreshold = 0.85; // For very light backgrounds

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate color distance from average background
          const colorDistance = Math.sqrt(
            Math.pow(r - avgR, 2) + 
            Math.pow(g - avgG, 2) + 
            Math.pow(b - avgB, 2)
          );

          // Calculate brightness
          const brightness = (r + g + b) / 3 / 255;

          // Check if pixel is similar to background or very light
          const isBackground = colorDistance < colorThreshold || brightness > brightnessThreshold;

          // Make background pixels transparent
          if (isBackground) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }

        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to blob and create File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }
            
            const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.png'), {
              type: 'image/png',
              lastModified: Date.now(),
            });
            
            resolve(processedFile);
          },
          'image/png',
          0.95
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Safely parses a JSON response from a fetch Response object
 * Handles cases where the response might not be valid JSON
 */
async function safeParseJSON(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  
  // Read response as text first so we can handle both JSON and non-JSON responses
  const text = await response.text();
  
  // Check if response is JSON
  if (contentType && contentType.includes('application/json')) {
    try {
      // Try to parse as JSON
      return JSON.parse(text);
    } catch (jsonError: any) {
      // If JSON parsing fails, throw error with the text content
      throw new Error(text || 'Invalid JSON response from server');
    }
  } else {
    // If not JSON, throw error with text content
    throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
  }
}

/**
 * Removes background from an image using Gemini API
 * @param image - The image file to process
 * @param backgroundType - Type of background: 'transparent', 'white', or 'custom'
 * @param customBackgroundColor - Hex color for custom background (e.g., '#FF0000')
 * @returns Promise with the processed image URL
 */
export async function removeBackgroundAPI(
  image: File,
  backgroundType: 'transparent' | 'white' | 'custom' = 'transparent',
  customBackgroundColor?: string
): Promise<string> {
  try {
    // Compress image before sending to reduce payload size
    const compressed = await compressImage(image, 1024, 1024, 0.85);
    const dataUrl = `data:${compressed.mimeType};base64,${compressed.data}`;
    
    // Prepare request body
    const requestBody: {
      image: { data: string; mimeType: string };
      backgroundType: string;
      customBackgroundColor?: string;
    } = {
      image: {
        data: dataUrl,
        mimeType: compressed.mimeType,
      },
      backgroundType,
    };

    if (backgroundType === 'custom' && customBackgroundColor) {
      requestBody.customBackgroundColor = customBackgroundColor;
    }

    // Call the API
    const response = await fetch('/api/remove-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await safeParseJSON(response);

    if (!response.ok) {
      throw new Error(data?.error || `Failed to remove background: ${response.status} ${response.statusText}`);
    }

    return data.imageUrl;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to remove background');
  }
}

/**
 * Normalizes the pose of a person in an image to a standing straight pose using Gemini API
 * @param image - The image file to process
 * @returns Promise with the processed image URL
 */
export async function normalizePoseAPI(image: File): Promise<string> {
  try {
    // Convert file to base64 with MIME type
    const base64 = await fileToBase64(image);
    const dataUrl = `data:${image.type};base64,${base64}`;
    
    // Prepare request body
    const requestBody: {
      image: { data: string; mimeType: string };
    } = {
      image: {
        data: dataUrl,
        mimeType: image.type || 'image/jpeg',
      },
    };

    // Call the API
    const response = await fetch('/api/normalize-pose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await safeParseJSON(response);

    if (!response.ok) {
      throw new Error(data?.error || `Failed to normalize pose: ${response.status} ${response.statusText}`);
    }

    return data.imageUrl;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to normalize pose');
  }
}

/**
 * Extracts a garment (shirt/top or pants/bottom) from an image of a person wearing it
 * @param image - The image file to process
 * @param garmentType - Type of garment: 'top' or 'bottom'
 * @returns Promise with the extracted garment image URL
 */
export async function extractGarmentAPI(
  image: File,
  garmentType: 'top' | 'bottom' = 'top'
): Promise<string> {
  try {
    // Compress image before sending to reduce payload size
    const compressed = await compressImage(image, 1024, 1024, 0.85);
    const dataUrl = `data:${compressed.mimeType};base64,${compressed.data}`;
    
    // Prepare request body
    const requestBody: {
      image: { data: string; mimeType: string };
      garmentType: 'top' | 'bottom';
    } = {
      image: {
        data: dataUrl,
        mimeType: compressed.mimeType,
      },
      garmentType,
    };

    // Call the API
    const response = await fetch('/api/extract-garment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await safeParseJSON(response);

    if (!response.ok) {
      throw new Error(data?.error || `Failed to extract garment: ${response.status} ${response.statusText}`);
    }

    return data.imageUrl;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to extract garment');
  }
}

