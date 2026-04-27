import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const source = typeof body.source === 'string' ? body.source : 'inline_glossary';

    if (!userId || !term) {
      return NextResponse.json({ error: 'Missing userId or term.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ event: null, source: 'local-fallback' }, { status: 202 });

    const { data, error } = await supabase
      .from('learning_events')
      .insert({ user_id: userId, term, source })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data, source: 'database' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save learning event.' }, { status: 500 });
  }
}
