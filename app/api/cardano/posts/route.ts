import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

const DEFAULT_ADMIN_EMAIL = 'ronjc1981@gmail.com';
const VALID_STATUSES = new Set(['draft', 'pending', 'approved', 'posted', 'rejected']);

function allowedAdminEmails() {
  const raw = process.env.CARDANO_ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL;
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false as const, status: 503, error: 'Supabase admin client is not configured.' };

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { ok: false as const, status: 401, error: 'Missing authorization token.' };

  const { data, error } = await supabase.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email) return { ok: false as const, status: 401, error: 'Invalid or expired session.' };
  if (!allowedAdminEmails().includes(email)) return { ok: false as const, status: 403, error: 'This account is not allowed to access Cardano admin.' };

  return { ok: true as const, supabase, email };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);

  let query = auth.supabase
    .from('cardano_posts')
    .select('id,batch_id,created_at,title,slot,series,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,x_url,raw_json')
    .order('created_at', { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const status = typeof body.status === 'string' ? body.status : '';
  const tweet = typeof body.tweet === 'string' ? body.tweet : undefined;
  const title = typeof body.title === 'string' ? body.title : undefined;
  const visualConcept = typeof body.visual_concept === 'string' ? body.visual_concept : undefined;
  const slot = typeof body.slot === 'string' ? body.slot : undefined;
  const series = typeof body.series === 'string' ? body.series : undefined;
  const imagePrompt = typeof body.image_prompt === 'string' ? body.image_prompt : undefined;
  const xPostId = typeof body.x_post_id === 'string' ? body.x_post_id : body.x_post_id === null ? null : undefined;
  const xUrl = typeof body.x_url === 'string' ? body.x_url : body.x_url === null ? null : undefined;

  if (!id) return NextResponse.json({ error: 'Missing post id.' }, { status: 400 });
  if (status && !VALID_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (tweet !== undefined) updates.tweet = tweet;
  if (title !== undefined) updates.title = title;
  if (visualConcept !== undefined) updates.visual_concept = visualConcept;
  if (slot !== undefined) updates.slot = slot;
  if (series !== undefined) updates.series = series;
  if (xPostId !== undefined) updates.x_post_id = xPostId;
  if (xUrl !== undefined) updates.x_url = xUrl;
  if (imagePrompt !== undefined) {
    const { data: existing, error: existingError } = await auth.supabase
      .from('cardano_posts')
      .select('raw_json')
      .eq('id', id)
      .single();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    const rawJson = (existing?.raw_json && typeof existing.raw_json === 'object' && !Array.isArray(existing.raw_json)) ? existing.raw_json : {};
    updates.raw_json = { ...rawJson, image_prompt: imagePrompt };
  }
  if (status === 'posted') updates.posted_at = new Date().toISOString();
  if (status && status !== 'posted') {
    updates.posted_at = null;
    updates.x_post_id = null;
    updates.x_url = null;
  }

  const { data, error } = await auth.supabase
    .from('cardano_posts')
    .update(updates)
    .eq('id', id)
    .select('id,batch_id,created_at,title,slot,series,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,x_url,raw_json')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
