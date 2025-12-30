// Configuration constants
export const config = {
  // File upload settings
  maxFileSize: 10 * 1024 * 1024, // 10 MB in bytes
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
  
  // Supabase feature flag
  supabaseEnabled: !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  
  // Google Generative AI model
  googleModel: 'gemini-2.5-flash-image',
  // Replicate model (commented out)
  // replicateModel: 'google/gemini-2.5-flash-image',
};




