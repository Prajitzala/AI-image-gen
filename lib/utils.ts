import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a File object to a base64 string
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

