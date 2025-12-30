# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Required - Get your token from https://replicate.com/account/api-tokens
   REPLICATE_API_TOKEN=your_replicate_api_token_here

   # Optional - For authentication and wardrobe features
   # Get these from your Supabase project settings
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Supabase Setup (Optional)

If you want to enable user authentication and wardrobe storage:

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Note your project URL and API keys

### 2. Create Storage Buckets
In your Supabase dashboard, go to Storage and create these buckets:
- `tops` (public)
- `bottoms` (public)
- `generated-outfits` (public)

### 3. Create Database Tables
Run this SQL in your Supabase SQL Editor:

```sql
-- Create clothing table
CREATE TABLE clothing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('top', 'bottom')),
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_outfits table
CREATE TABLE generated_outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  top_id UUID NOT NULL REFERENCES clothing(id) ON DELETE CASCADE,
  bottom_id UUID NOT NULL REFERENCES clothing(id) ON DELETE CASCADE,
  result_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE clothing ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_outfits ENABLE ROW LEVEL SECURITY;

-- Create policies for clothing table
CREATE POLICY "Users can view their own clothing"
  ON clothing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clothing"
  ON clothing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clothing"
  ON clothing FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for generated_outfits table
CREATE POLICY "Users can view their own outfits"
  ON generated_outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON generated_outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 4. Update Environment Variables
Add your Supabase credentials to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Getting Your Replicate API Token

1. Go to [replicate.com](https://replicate.com)
2. Sign up or log in
3. Navigate to [Account Settings > API Tokens](https://replicate.com/account/api-tokens)
4. Create a new token or copy your existing token
5. Add it to your `.env.local` file

## Troubleshooting

### "REPLICATE_API_TOKEN is not configured"
- Make sure you've created a `.env.local` file
- Verify the token is correct (no extra spaces)
- Restart your development server after adding environment variables

### Supabase features not working
- Verify all three Supabase environment variables are set
- Check that the database tables and policies are created
- Ensure storage buckets are created and set to public

### Image upload errors
- Check file size (max 10MB)
- Verify file type (PNG, JPG, JPEG, WEBP only)
- Check browser console for detailed error messages





