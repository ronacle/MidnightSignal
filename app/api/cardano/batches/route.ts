import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_ADMIN_EMAIL = 'ronjc1981@gmail.com';
const VALID_BATCH_STATUSES = new Set(['draft', 'processed', 'archived']);

function allowedAdminEmails() {
  const raw = process.env.CARDANO_ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL;
  return raw.split(',').map((email: string) => email.trim().toLowerCase()).filter(Boolean);
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

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI response did not contain valid JSON.');
    return JSON.parse(match[0]);
  }
}

function buildGenerationPrompt(template: string, sourceUrls: unknown) {
  const urls = Array.isArray(sourceUrls) ? sourceUrls.filter((url) => typeof url === 'string') : [];
  return `You are the editorial engine for Cardano Midnight News / Midnight Signal.

Use the source template below to generate exactly 5 related X-ready editorial posts. Posts may exceed 280 characters when useful because publishing is manual through X Premium. Prioritize clarity, accuracy, source grounding, and Cardano/Midnight relevance.

Generate exactly these 5 posts, in this order, and include the matching slot + series values for each one:
1. slot: "Morning", series: "📊 ADA Market Watch"
2. slot: "Afternoon", series: "🌙 Cardano Signal Watch"
3. slot: "Evening", series: "🌙 Cardano Midnight Brief"
4. slot: "Night", series: "🧠 Cardano Ecosystem Insight"
5. slot: "Anytime", series: "🌙 Community Pulse"

For each post, return:
- title matching the series
- slot
- series
- tweet
- visual_concept
- image_prompt_json with story_context, visual_concept, art_direction, and final_image_prompt

Image prompt goal: premium crypto editorial brief card, not generic clipart. The final_image_prompt must be directly copy/pasteable into ChatGPT image generation. Include narrative context, mood, layout, branding, and avoid-rules.

Brand style:
- Midnight-blue / cyan / violet palette
- Premium crypto research desk aesthetic
- Editorial infographic design
- Futuristic, institutional, secure, privacy-aware
- Avoid flat generic icons, clutter, misspelled text, photorealistic celebrities, fake screenshots

Source URLs:
${urls.map((url, index) => `${index + 1}. ${url}`).join('\n') || 'None provided'}

Template:
${template}

Return ONLY valid JSON in this exact shape:
{
  "posts": [
    {
      "title": "🌙 Cardano Midnight Brief",
      "slot": "Evening",
      "series": "🌙 Cardano Midnight Brief",
      "tweet": "...",
      "visual_concept": "...",
      "image_prompt_json": {
        "story_context": {
          "headline": "...",
          "themes": ["..."],
          "tone": "...",
          "narrative": "..."
        },
        "visual_concept": {
          "composition": "...",
          "symbols": ["..."],
          "layout": "..."
        },
        "art_direction": {
          "style": "...",
          "lighting": "...",
          "branding": "...",
          "avoid": ["..."]
        },
        "final_image_prompt": "..."
      }
    }
  ]
}`;
}

function getFinalImagePrompt(imagePromptJson: unknown, fallback: string) {
  if (imagePromptJson && typeof imagePromptJson === 'object' && !Array.isArray(imagePromptJson)) {
    const prompt = (imagePromptJson as Record<string, unknown>).final_image_prompt;
    if (typeof prompt === 'string' && prompt.trim()) return prompt;
  }
  return fallback;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = Math.min(Number(searchParams.get('limit') || '25'), 75);
  let batchQuery = auth.supabase.from('cardano_batches').select('id,title,template,source_urls,status,created_at,processed_at,raw_json').order('created_at', { ascending: false }).limit(Number.isFinite(limit) ? limit : 25);
  if (status && status !== 'all') batchQuery = batchQuery.eq('status', status);
  const { data: batches, error: batchError } = await batchQuery;
  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  const batchIds = (batches || []).map((batch: any) => batch.id);
  let postsByBatch: Record<string, unknown[]> = {};
  if (batchIds.length) {
    const { data: posts, error: postError } = await auth.supabase.from('cardano_posts').select('id,batch_id,created_at,title,slot,series,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,x_url,raw_json').in('batch_id', batchIds).order('created_at', { ascending: true });
    if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });
    postsByBatch = (posts || []).reduce((acc: Record<string, unknown[]>, post: any) => {
      const key = post.batch_id || 'unbatched';
      acc[key] = acc[key] || [];
      acc[key].push(post);
      return acc;
    }, {});
  }
  return NextResponse.json({ batches: (batches || []).map((batch: any) => ({ ...batch, posts: postsByBatch[batch.id] || [] })) });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const status = typeof body.status === 'string' ? body.status : undefined;
  const title = typeof body.title === 'string' ? body.title : undefined;
  const template = typeof body.template === 'string' ? body.template : undefined;
  if (!id) return NextResponse.json({ error: 'Missing batch id.' }, { status: 400 });
  if (status && !VALID_BATCH_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid batch status.' }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (title !== undefined) updates.title = title;
  if (template !== undefined) updates.template = template;
  const { data, error } = await auth.supabase.from('cardano_batches').update(updates).eq('id', id).select('id,title,template,source_urls,status,created_at,processed_at,raw_json').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ batch: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  const batchId = typeof body.batch_id === 'string' ? body.batch_id : '';
  if (!batchId) return NextResponse.json({ error: 'Missing batch_id.' }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Missing OPENAI_API_KEY.' }, { status: 500 });
  const { data: batch, error: batchError } = await auth.supabase.from('cardano_batches').select('id,title,template,source_urls,status,created_at,processed_at,raw_json').eq('id', batchId).single();
  if (batchError || !batch) return NextResponse.json({ error: batchError?.message || 'Batch not found.' }, { status: 404 });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || 'gpt-5.1', input: buildGenerationPrompt(batch.template, batch.source_urls) })
  });
  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: `OpenAI generation failed: ${response.status} ${text}` }, { status: 502 });
  }
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || '').join('\n') || '';
  const parsed = safeJsonParse(outputText);
  if (!Array.isArray(parsed.posts) || parsed.posts.length !== 5) return NextResponse.json({ error: 'Expected exactly 5 generated posts from OpenAI.' }, { status: 502 });
  const rows = parsed.posts.map((post: any) => ({
    batch_id: batch.id,
    title: post.title || post.series || 'Cardano Midnight Brief',
    slot: post.slot || null,
    series: post.series || post.title || null,
    tweet: post.tweet || '',
    visual_concept: post.visual_concept || post.image_prompt_json?.visual_concept?.composition || '',
    image_url: null,
    source_urls: batch.source_urls || [],
    status: 'pending',
    raw_json: { ...post, image_prompt_json: post.image_prompt_json || null, image_prompt: getFinalImagePrompt(post.image_prompt_json, post.visual_concept || '') }
  }));
  const { data: posts, error: insertError } = await auth.supabase.from('cardano_posts').insert(rows).select('id,batch_id,created_at,title,slot,series,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,x_url,raw_json');
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  const { data: updatedBatch, error: updateError } = await auth.supabase.from('cardano_batches').update({ status: 'processed', processed_at: new Date().toISOString(), raw_json: { ...(batch.raw_json || {}), last_generation: parsed } }).eq('id', batch.id).select('id,title,template,source_urls,status,created_at,processed_at,raw_json').single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ batch: { ...updatedBatch, posts: posts || [] }, posts: posts || [] });
}
