import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_ADMIN_EMAIL = 'ronjc1981@gmail.com';
const DEFAULT_BUCKET = 'cardano-post-images';
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;

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

function extensionForMimeType(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });

  const id = formData.get('id');
  const image = formData.get('image');

  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing post id.' }, { status: 400 });
  if (!(image instanceof File)) return NextResponse.json({ error: 'Missing image file.' }, { status: 400 });
  if (!image.type.startsWith('image/')) return NextResponse.json({ error: 'Uploaded file must be an image.' }, { status: 400 });
  if (image.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ error: 'Image file is too large. Max size is 12 MB.' }, { status: 400 });

  const { data: post, error: fetchError } = await auth.supabase
    .from('cardano_posts')
    .select('id,created_at,title,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,raw_json')
    .eq('id', id)
    .single();

  if (fetchError || !post) return NextResponse.json({ error: fetchError?.message || 'Post not found.' }, { status: 404 });

  const bucketName = process.env.SUPABASE_IMAGE_BUCKET || DEFAULT_BUCKET;
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = extensionForMimeType(image.type);
  const objectPath = `manual/${runId}/${safeSlug(post.title || 'cardano-post')}-${post.id}.${extension}`;
  const imageBuffer = Buffer.from(await image.arrayBuffer());

  const { error: uploadError } = await auth.supabase.storage
    .from(bucketName)
    .upload(objectPath, imageBuffer, {
      contentType: image.type || 'image/png',
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
        manually_uploaded_image_at: new Date().toISOString(),
        manually_uploaded_image_name: image.name || null
      }
    })
    .eq('id', id)
    .select('id,created_at,title,tweet,visual_concept,image_url,source_urls,status,posted_at,x_post_id,raw_json')
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ post: updated, image_url: imageUrl });
}
