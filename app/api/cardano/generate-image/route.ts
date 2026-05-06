import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_ADMIN_EMAIL = 'ronjc1981@gmail.com';
const DEFAULT_BUCKET = 'cardano-post-images';

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

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'cardano-post';
}

function getImagePrompt(post: any, overridePrompt?: string) {
  const raw = post?.raw_json && typeof post.raw_json === 'object' && !Array.isArray(post.raw_json) ? post.raw_json : {};
  return (overridePrompt || raw.image_prompt || raw.imagePrompt || post?.visual_concept || '').toString().trim();
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const overridePrompt = typeof body.image_prompt === 'string' ? body.image_prompt : undefined;
  if (!id) return NextResponse.json({ error: 'Missing post id.' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Missing OPENAI_API_KEY.' }, { status: 500 });

  const { data: post, error: fetchError } = await auth.supabase
    .from('cardano_posts')
    .select('id,created_at,title,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,raw_json')
    .eq('id', id)
    .single();

  if (fetchError || !post) return NextResponse.json({ error: fetchError?.message || 'Post not found.' }, { status: 404 });

  const prompt = getImagePrompt(post, overridePrompt);
  if (!prompt) return NextResponse.json({ error: 'Missing image prompt or visual concept.' }, { status: 400 });

  const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const imageSize = process.env.OPENAI_IMAGE_SIZE || '1536x1024';

  let b64: string | undefined;
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: imageModel,
        prompt,
        size: imageSize
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `OpenAI image generation failed with status ${response.status}.`;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    b64 = payload?.data?.[0]?.b64_json;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenAI image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!b64) return NextResponse.json({ error: 'No image data returned from OpenAI.' }, { status: 500 });

  const imageBuffer = Buffer.from(b64, 'base64');
  const bucketName = process.env.SUPABASE_IMAGE_BUCKET || DEFAULT_BUCKET;
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const objectPath = `${runId}/${safeSlug(post.title || 'cardano-post')}-${post.id}.png`;

  const { error: uploadError } = await auth.supabase.storage
    .from(bucketName)
    .upload(objectPath, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) return NextResponse.json({ error: `Supabase image upload failed: ${uploadError.message}` }, { status: 500 });

  const { data: publicUrlData } = auth.supabase.storage.from(bucketName).getPublicUrl(objectPath);
  const imageUrl = publicUrlData.publicUrl;
  const rawJson = post.raw_json && typeof post.raw_json === 'object' && !Array.isArray(post.raw_json) ? post.raw_json : {};

  const { data: updated, error: updateError } = await auth.supabase
    .from('cardano_posts')
    .update({
      image_url: imageUrl,
      raw_json: {
        ...rawJson,
        image_prompt: prompt,
        generated_image_prompt: prompt,
        generated_image_at: new Date().toISOString()
      }
    })
    .eq('id', id)
    .select('id,created_at,title,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,raw_json')
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ post: updated, image_url: imageUrl });
}
