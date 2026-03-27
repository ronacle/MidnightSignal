// Example frontend snippets for your existing app

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function signInWithMagicLink(email) {
  return supabase.auth.signInWithOtp({ email });
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function startCheckout() {
  const user = await getCurrentUser();
  if (!user?.id || !user?.email) {
    throw new Error('User must be signed in first.');
  }

  const response = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      email: user.email,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Checkout failed.');
  }

  window.location.href = data.url;
}

export async function fetchPlan() {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const response = await fetch(`/api/get-plan?userId=${encodeURIComponent(user.id)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Plan lookup failed.');
  }

  return data.profile;
}
