'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, CheckCircle2, Circle, Copy, ExternalLink, FileJson, Loader2, Maximize2, RefreshCw, Save, Shield, Sparkles, UploadCloud, X as CloseIcon, XCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type CardanoPost = {
  id: string;
  batch_id?: string | null;
  created_at: string;
  title: string | null;
  slot?: string | null;
  series?: string | null;
  tweet: string | null;
  visual_concept: string | null;
  image_url: string | null;
  source_urls: string[] | null;
  status: 'draft' | 'pending' | 'approved' | 'posted' | 'rejected' | string | null;
  posted_at: string | null;
  x_post_id: string | null;
  x_url?: string | null;
  raw_json: Record<string, unknown> | null;
};

type CardanoBatch = {
  id: string;
  title: string | null;
  template: string;
  source_urls: string[] | null;
  status: 'draft' | 'processed' | 'archived' | string | null;
  created_at: string;
  processed_at: string | null;
  raw_json: Record<string, unknown> | null;
  posts: CardanoPost[];
};

type ExpandedImage = { url: string; title: string } | null;

const postStatusStyles: Record<string, string> = {
  draft: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  approved: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  posted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  rejected: 'border-rose-400/30 bg-rose-400/10 text-rose-100'
};

const batchStatusStyles: Record<string, string> = {
  draft: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  processed: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  archived: 'border-slate-500/30 bg-slate-500/10 text-slate-200'
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

const scheduleOrder = ['Morning', 'Afternoon', 'Evening', 'Night', 'Anytime'];

function getPostSchedule(post: CardanoPost) {
  const raw = post.raw_json || {};
  const slot = post.slot || (typeof raw.slot === 'string' ? raw.slot : '') || scheduleOrder.find((value) => (post.title || '').toLowerCase().includes(value.toLowerCase())) || '';
  const series = post.series || (typeof raw.series === 'string' ? raw.series : '') || post.title || '';
  return { slot, series };
}

function getImagePromptJson(post: CardanoPost) {
  const raw = post.raw_json || {};
  const value = raw.image_prompt_json || raw.imagePromptJson || null;
  return value && typeof value === 'object' ? value : null;
}

function getPostImagePrompt(post: CardanoPost) {
  const raw = post.raw_json || {};
  const json = getImagePromptJson(post) as Record<string, unknown> | null;
  const finalPrompt = json && typeof json.final_image_prompt === 'string' ? json.final_image_prompt : '';
  const value = raw.image_prompt || raw.imagePrompt || raw.generated_image_prompt || finalPrompt || '';
  return typeof value === 'string' ? value : '';
}

function setPostImagePrompt(post: CardanoPost, imagePrompt: string): CardanoPost {
  return { ...post, raw_json: { ...(post.raw_json || {}), image_prompt: imagePrompt } };
}

function getTweetComposerUrl(post: CardanoPost) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(post.tweet || '')}`;
}

function extractXPostId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/status\/(\d+)/) || trimmed.match(/\/post\/(\d+)/) || trimmed.match(/^(\d+)$/);
  return match ? match[1] : trimmed;
}

export default function CardanoAdminPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [email, setEmail] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState('');
  const [batches, setBatches] = useState<CardanoBatch[]>([]);
  const [batchFilter, setBatchFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingBatchId, setGeneratingBatchId] = useState<string | null>(null);
  const [imageGeneratingId, setImageGeneratingId] = useState<string | null>(null);
  const [imageUploadingId, setImageUploadingId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<ExpandedImage>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError('Supabase browser client is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setSessionToken(session?.access_token || null);
      setAuthEmail(session?.user?.email || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token || null);
      setAuthEmail(session?.user?.email || null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (sessionToken) void loadBatches();
  }, [sessionToken, batchFilter]);

  async function sendMagicLink() {
    if (!supabase || !email) return;
    setAuthMessage('Sending sign-in link...');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/cardano-admin` } });
    setAuthMessage(error ? error.message : 'Check your email for the sign-in link.');
  }

  async function loadBatches() {
    if (!sessionToken) return;
    setError('');
    setLoading(true);
    const params = new URLSearchParams({ status: batchFilter, limit: '30' });
    const response = await fetch(`/api/cardano/batches?${params.toString()}`, { headers: { Authorization: `Bearer ${sessionToken}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || 'Unable to load Cardano batches. Run the batch SQL migration first.');
      setBatches([]);
    } else {
      setBatches(payload.batches || []);
    }
    setLoading(false);
  }

  async function copyText(text: string, label: string) {
    if (!text.trim()) {
      setError(`Nothing to copy for ${label}.`);
      return;
    }
    await navigator.clipboard.writeText(text);
    setNotice(`${label} copied.`);
    setError('');
  }

  async function updateBatch(batch: CardanoBatch, updates: Partial<CardanoBatch>) {
    if (!sessionToken) return;
    setSavingId(batch.id);
    setError('');
    setNotice('');
    const response = await fetch('/api/cardano/batches', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: batch.id, ...updates })
    });
    const payload = await response.json().catch(() => ({}));
    setSavingId(null);
    if (!response.ok) {
      setError(payload.error || 'Unable to update batch.');
      return;
    }
    setBatches((current) => current.map((item) => (item.id === batch.id ? { ...item, ...payload.batch, posts: item.posts } : item)));
  }

  async function generatePosts(batch: CardanoBatch) {
    if (!sessionToken) return;
    const confirmed = window.confirm('Generate 5 posts from this template using OpenAI? This will use API credits.');
    if (!confirmed) return;
    setGeneratingBatchId(batch.id);
    setError('');
    setNotice('');
    const response = await fetch('/api/cardano/batches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batch.id })
    });
    const payload = await response.json().catch(() => ({}));
    setGeneratingBatchId(null);
    if (!response.ok) {
      setError(payload.error || 'Unable to generate posts.');
      return;
    }
    setBatches((current) => current.map((item) => (item.id === batch.id ? payload.batch : item)));
    setNotice('Generated 5 posts from the batch template.');
  }

  async function updatePost(post: CardanoPost, updates: Partial<CardanoPost> & { image_prompt?: string }) {
    if (!sessionToken) return;
    setSavingId(post.id);
    setError('');
    setNotice('');
    const response = await fetch('/api/cardano/posts', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, ...updates })
    });
    const payload = await response.json().catch(() => ({}));
    setSavingId(null);
    if (!response.ok) {
      setError(payload.error || 'Unable to update post.');
      return;
    }
    setBatches((current) => current.map((batch) => ({ ...batch, posts: batch.posts.map((item) => (item.id === post.id ? payload.post : item)) })));
  }

  async function generateImage(post: CardanoPost) {
    if (!sessionToken) return;
    const imagePrompt = getPostImagePrompt(post) || post.visual_concept || '';
    if (!imagePrompt.trim()) {
      setError('Add an image prompt or visual concept before generating an image.');
      return;
    }
    setImageGeneratingId(post.id);
    setError('');
    const response = await fetch('/api/cardano/generate-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, image_prompt: imagePrompt })
    });
    const payload = await response.json().catch(() => ({}));
    setImageGeneratingId(null);
    if (!response.ok) {
      setError(payload.error || 'Unable to generate image.');
      return;
    }
    setBatches((current) => current.map((batch) => ({ ...batch, posts: batch.posts.map((item) => (item.id === post.id ? payload.post : item)) })));
  }

  async function uploadImage(post: CardanoPost, file: File | null | undefined) {
    if (!sessionToken || !file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setImageUploadingId(post.id);
    setError('');
    const formData = new FormData();
    formData.append('id', post.id);
    formData.append('image', file);
    const response = await fetch('/api/cardano/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` }, body: formData });
    const payload = await response.json().catch(() => ({}));
    setImageUploadingId(null);
    if (!response.ok) {
      setError(payload.error || 'Unable to upload image.');
      return;
    }
    setBatches((current) => current.map((batch) => ({ ...batch, posts: batch.posts.map((item) => (item.id === post.id ? payload.post : item)) })));
    const input = fileInputRefs.current[post.id];
    if (input) input.value = '';
  }

  async function markPosted(post: CardanoPost) {
    const input = window.prompt('Paste the X post URL after publishing. Leave blank to mark posted without a URL.');
    if (input === null) return;
    const xUrl = input.trim() || null;
    const xPostId = xUrl ? extractXPostId(xUrl) : null;
    await updatePost(post, { status: 'posted', x_post_id: xPostId, x_url: xUrl });
  }

  if (!sessionToken) {
    return (
      <main className="min-h-screen bg-[#040814] px-6 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-cyan-400/20 bg-white/[0.04] p-8 shadow-2xl shadow-cyan-950/40">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200"><Shield /></div>
            <div><p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Midnight Signal</p><h1 className="text-3xl font-semibold">Cardano Admin</h1></div>
          </div>
          <p className="mb-6 text-sm leading-6 text-slate-300">Sign in with your authorized admin email to review Cardano batches and generated posts.</p>
          <input className="mb-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none ring-cyan-300/20 focus:ring-4" placeholder="admin@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button onClick={sendMagicLink} className="w-full rounded-2xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200">Send magic link</button>
          {authMessage && <p className="mt-4 text-sm text-cyan-100">{authMessage}</p>}
          {error && <p className="mt-4 text-sm text-rose-200">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#040814] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-purple-500/10 p-6 shadow-2xl shadow-cyan-950/30 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Cardano Nightly</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Editorial Batch Desk</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Review source templates for free/manual use, optionally generate posts with OpenAI, copy image JSON for ChatGPT image creation, and manually publish to X.</p>
            {authEmail && <p className="mt-3 text-xs text-slate-400">Signed in as {authEmail}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'draft', 'processed', 'archived'].map((status) => <button key={status} onClick={() => setBatchFilter(status)} className={`rounded-full border px-4 py-2 text-sm capitalize transition ${batchFilter === status ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}>{status}</button>)}
            <button onClick={loadBatches} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"><RefreshCw size={16} /> Refresh</button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>}
        {notice && <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>}
        {loading && <div className="flex items-center gap-2 text-slate-300"><Loader2 className="animate-spin" size={18} /> Loading batches...</div>}
        {!loading && batches.length === 0 && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">No batches found. Run the Railway bot after applying the SQL migration.</div>}

        <div className="grid gap-6">
          {batches.map((batch) => {
            const batchStatus = batch.status || 'draft';
            const batchSaving = savingId === batch.id;
            const batchGenerating = generatingBatchId === batch.id;
            return (
              <section key={batch.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] shadow-xl shadow-black/20">
                <div className="border-b border-white/10 p-5">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${batchStatusStyles[batchStatus] || batchStatusStyles.draft}`}>{batchStatus}</span>
                        <span className="text-xs text-slate-400">Batch · {formatDate(batch.created_at)}</span>
                        <span className="text-xs text-slate-500">{batch.posts.length} generated post(s)</span>
                      </div>
                      <input className="w-full bg-transparent text-2xl font-semibold outline-none" value={batch.title || ''} onChange={(event) => setBatches((current) => current.map((item) => item.id === batch.id ? { ...item, title: event.target.value } : item))} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={batchSaving} onClick={() => updateBatch(batch, { title: batch.title, template: batch.template })} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"><Save size={16} /> Save Batch</button>
                      <button onClick={() => copyText(batch.template, 'Template')} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20"><Copy size={16} /> Copy Template</button>
                      <button disabled={batchGenerating} onClick={() => generatePosts(batch)} className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{batchGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Generate Posts</button>
                      <button disabled={batchSaving} onClick={() => updateBatch(batch, { status: 'archived' })} className="inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-500/10 px-4 py-2 text-sm text-slate-100 hover:bg-slate-500/20"><Archive size={16} /> Archive</button>
                    </div>
                  </div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-cyan-200/60">Source Template</label>
                  <textarea className="min-h-48 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-100 outline-none ring-cyan-300/20 focus:ring-4" value={batch.template} onChange={(event) => setBatches((current) => current.map((item) => item.id === batch.id ? { ...item, template: event.target.value } : item))} />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(batch.source_urls || []).slice(0, 6).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-cyan-100 hover:bg-white/10"><ExternalLink size={13} /> {url}</a>)}
                  </div>
                </div>

                <div className="grid gap-5 p-5">
                  {batch.posts.length === 0 ? <div className="rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/5 p-6 text-sm text-cyan-100/80">No generated posts yet. Copy the template for free/manual work, or click Generate Posts when you want OpenAI to process it.</div> : batch.posts.map((post) => {
                    const status = post.status || 'draft';
                    const isSaving = savingId === post.id;
                    const isGeneratingImage = imageGeneratingId === post.id;
                    const isUploadingImage = imageUploadingId === post.id;
                    const imagePrompt = getPostImagePrompt(post);
                    const { slot, series } = getPostSchedule(post);
                    const imagePromptJson = getImagePromptJson(post);
                    const imagePromptJsonText = imagePromptJson ? JSON.stringify(imagePromptJson, null, 2) : JSON.stringify({ story_context: {}, visual_concept: { composition: post.visual_concept || '' }, art_direction: {}, final_image_prompt: imagePrompt || post.visual_concept || '' }, null, 2);
                    return (
                      <article key={post.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${postStatusStyles[status] || postStatusStyles.draft}`}>{status}</span>
                              {slot && <span className="rounded-full border border-indigo-300/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-100">{slot}</span>}
                              {series && <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">{series}</span>}
                              <span className="text-xs text-slate-500">Post · {formatDate(post.created_at)}</span>
                              {post.x_url && <a href={post.x_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-200 underline">View on X</a>}
                            </div>
                            {slot && series && <p className="mb-2 text-sm text-slate-400">Suggested posting window: <span className="font-semibold text-cyan-100">{slot}</span> · {series}</p>}
                            <input className="w-full bg-transparent text-xl font-semibold outline-none" value={post.title || ''} onChange={(event) => setBatches((current) => current.map((b) => b.id === batch.id ? { ...b, posts: b.posts.map((item) => item.id === post.id ? { ...item, title: event.target.value } : item) } : b))} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button disabled={isSaving} onClick={() => updatePost(post, { title: post.title, tweet: post.tweet, visual_concept: post.visual_concept, image_prompt: imagePrompt })} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"><Save size={16} /> Save</button>
                            <button disabled={isSaving} onClick={() => updatePost(post, { status: 'approved' })} className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"><CheckCircle2 size={16} /> Approve</button>
                            <button disabled={isSaving} onClick={() => updatePost(post, { status: 'rejected' })} className="inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/20"><XCircle size={16} /> Reject</button>
                            <button type="button" onClick={() => copyText(post.tweet || '', 'Post')} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20"><Copy size={16} /> Copy Post</button>
                            <a href={getTweetComposerUrl(post)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"><ExternalLink size={16} /> Open X Composer</a>
                            <button type="button" onClick={() => copyText(imagePromptJsonText, 'Image JSON')} className="inline-flex items-center gap-2 rounded-full border border-purple-300/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-100 hover:bg-purple-500/20"><FileJson size={16} /> Copy Image JSON</button>
                            <button disabled={isSaving} onClick={() => markPosted(post)} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20"><CheckCircle2 size={16} /> Mark Posted</button>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                          <div className="space-y-4">
                            <label className="block text-xs uppercase tracking-[0.25em] text-cyan-200/60">Post</label>
                            <textarea className="min-h-56 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-100 outline-none ring-cyan-300/20 focus:ring-4" value={post.tweet || ''} onChange={(event) => setBatches((current) => current.map((b) => b.id === batch.id ? { ...b, posts: b.posts.map((item) => item.id === post.id ? { ...item, tweet: event.target.value } : item) } : b))} />
                            <div className="text-xs text-slate-500">{(post.tweet || '').length} characters · Manual composer mode allows long-form Premium posts.</div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-purple-200/60">Image JSON</label>
                            <textarea readOnly className="min-h-64 w-full rounded-2xl border border-purple-300/10 bg-black/25 p-4 font-mono text-xs leading-5 text-purple-50 outline-none" value={imagePromptJsonText} />
                          </div>

                          <aside className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                            {post.image_url ? <button type="button" onClick={() => setExpandedImage({ url: post.image_url || '', title: post.title || 'Generated visual' })} className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-cyan-300/10 text-left outline-none ring-cyan-300/20 transition hover:border-cyan-300/40 focus:ring-4"><img src={post.image_url} alt={post.title || 'Generated visual'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /><span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-white opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100"><Maximize2 size={13} /> Expand</span></button> : <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/5 text-center text-xs text-cyan-100/70">No hosted image URL yet</div>}
                            <div className="flex flex-wrap gap-2">
                              <input ref={(node) => { fileInputRefs.current[post.id] = node; }} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void uploadImage(post, event.target.files?.[0])} />
                              <button type="button" disabled={isUploadingImage || isGeneratingImage} onClick={() => fileInputRefs.current[post.id]?.click()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-60">{isUploadingImage ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}{post.image_url ? 'Replace Image' : 'Upload Image'}</button>
                              <button disabled={isGeneratingImage || isUploadingImage} onClick={() => generateImage(post)} className="inline-flex items-center gap-2 rounded-full border border-purple-300/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-100 hover:bg-purple-500/20 disabled:cursor-wait disabled:opacity-60">{isGeneratingImage ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} API Image</button>
                            </div>
                            <p className="text-xs leading-5 text-slate-500">Low-cost workflow: copy Image JSON, paste into ChatGPT manually, then upload the final image here.</p>
                            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-purple-200/60">Visual concept</label>
                            <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-200 outline-none" value={post.visual_concept || ''} onChange={(event) => setBatches((current) => current.map((b) => b.id === batch.id ? { ...b, posts: b.posts.map((item) => item.id === post.id ? { ...item, visual_concept: event.target.value } : item) } : b))} />
                            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-cyan-200/60">Final image prompt</label>
                            <textarea className="min-h-36 w-full rounded-2xl border border-cyan-300/10 bg-black/25 p-3 text-xs leading-5 text-slate-100 outline-none ring-cyan-300/20 focus:ring-4" value={imagePrompt} onChange={(event) => setBatches((current) => current.map((b) => b.id === batch.id ? { ...b, posts: b.posts.map((item) => item.id === post.id ? setPostImagePrompt(item, event.target.value) : item) } : b))} />
                            <div className="flex items-center gap-2 text-xs text-slate-500"><Circle size={10} /> Manual publishing mode: copy/open X, attach image manually, then save the X link with Mark Posted.</div>
                          </aside>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {expandedImage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><button type="button" aria-label="Close expanded image" onClick={() => setExpandedImage(null)} className="absolute inset-0 cursor-zoom-out" /><div className="relative z-10 max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-cyan-950/50"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><p className="truncate pr-4 text-sm font-semibold text-slate-100">{expandedImage.title}</p><button type="button" onClick={() => setExpandedImage(null)} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"><CloseIcon size={18} /></button></div><img src={expandedImage.url} alt={expandedImage.title} className="max-h-[82vh] w-full object-contain" /></div></div>}
    </main>
  );
}
