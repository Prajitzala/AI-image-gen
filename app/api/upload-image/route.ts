import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  if (!config.supabaseEnabled) {
    return NextResponse.json(
      { error: 'Supabase is not enabled' },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'top' | 'bottom';
    const userId = formData.get('userId') as string;

    if (!file || !type || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not available' },
        { status: 500 }
      );
    }
    const bucketName = type === 'top' ? 'tops' : 'bottoms';
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('clothing')
      .insert({
        user_id: userId,
        type,
        image_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ item: dbData });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

