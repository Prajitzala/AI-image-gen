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
    const body = await request.json();
    const { userId, topId, bottomId, resultImageUrl } = body;

    if (!userId || !topId || !bottomId || !resultImageUrl) {
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

    const { data, error } = await supabase
      .from('generated_outfits')
      .insert({
        user_id: userId,
        top_id: topId,
        bottom_id: bottomId,
        result_image_url: resultImageUrl,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ outfit: data });
  } catch (error: any) {
    console.error('Error saving outfit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save outfit' },
      { status: 500 }
    );
  }
}

