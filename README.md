# AI Outfit Generator

An AI-powered virtual try-on web application that lets users preview outfits by combining their own top and bottom clothing images with an optional full-body photo. The system uses Google's Gemini 2.5 Flash Image model via Replicate to generate realistic images.

## Features

- **Image Upload**: Drag-and-drop or click to upload top, bottom, and optional full-body photos
- **AI Generation**: Uses Replicate API with Gemini 2.5 Flash Image model for realistic outfit visualization
- **Result Display**: View generated outfits with download functionality
- **Optional Authentication**: Supabase integration for user accounts and wardrobe storage
- **Wardrobe Management**: Save and manage clothing items (if Supabase enabled)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Replicate API token (required)
- Supabase account (optional, for authentication and storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AI-outfit
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
# Required
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Optional - for Supabase features
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Setup (Optional)

If you want to enable authentication and wardrobe storage:

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Create the following storage buckets:
   - `tops`
   - `bottoms`
   - `generated-outfits`

3. Run the following SQL in your Supabase SQL editor:

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

-- Create policies
CREATE POLICY "Users can view their own clothing"
  ON clothing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clothing"
  ON clothing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clothing"
  ON clothing FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own outfits"
  ON generated_outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON generated_outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

4. Update your `.env.local` with Supabase credentials.

## Usage

1. **Upload Images**:
   - Upload a top clothing image (shirt, blouse, etc.)
   - Upload a bottom clothing image (pants, skirt, etc.)
   - Optionally upload a full-body photo, or select "Use default model"

2. **Generate Outfit**:
   - Click "Generate Outfit" button
   - Wait for the AI to process (may take several seconds)

3. **View Results**:
   - See the generated outfit image
   - Download the image
   - Create a new outfit combination

## Configuration

Edit `lib/config.ts` to customize:
- Maximum file size (default: 10MB)
- Allowed file types
- Replicate model settings

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Replicate** - AI model API
- **Supabase** - Authentication and storage (optional)
- **React Dropzone** - File uploads

## Project Structure

```
AI-outfit/
├── app/
│   ├── api/
│   │   ├── generate-outfit/    # API route for outfit generation
│   │   ├── upload-image/       # API route for image uploads (Supabase)
│   │   └── save-outfit/        # API route for saving outfits (Supabase)
│   ├── page.tsx                # Main home page
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/
│   ├── ImageUpload.tsx         # Image upload component
│   ├── Auth.tsx                # Authentication component
│   └── Wardrobe.tsx            # Wardrobe management component
├── lib/
│   ├── config.ts               # Configuration constants
│   ├── types.ts                # TypeScript types
│   ├── utils.ts                # Utility functions
│   └── supabase/               # Supabase client utilities
└── package.json
```

## License

MIT





