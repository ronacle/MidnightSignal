import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'missing_user_id' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'profile_not_found' });
    }

    return res.status(200).json({ profile: data });
  } catch (error) {
    console.error('get-plan error:', error);
    return res.status(500).json({
      error: 'plan_lookup_failed',
      detail: String(error?.message || error),
    });
  }
}
