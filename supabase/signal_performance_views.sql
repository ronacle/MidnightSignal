create or replace view public.signal_feedback_performance_v15_3 as
select
  user_id,
  coalesce(label, 'Mixed') as signal_type,
  symbol,
  count(*) as total_feedback,
  count(*) filter (where action = 'acted') as acted_count,
  count(*) filter (where action = 'ignored') as ignored_count,
  count(*) filter (where outcome = 'win') as win_count,
  count(*) filter (where outcome = 'loss') as loss_count,
  count(*) filter (where outcome = 'neutral') as neutral_count,
  case
    when count(*) filter (where outcome in ('win', 'loss')) = 0 then 0
    else round((count(*) filter (where outcome = 'win')::numeric / count(*) filter (where outcome in ('win', 'loss'))::numeric) * 100)
  end as win_rate,
  case
    when count(*) = 0 then 0
    else round((count(*) filter (where action = 'acted')::numeric / count(*)::numeric) * 100)
  end as action_rate,
  max(created_at) as latest_feedback_at
from public.signal_feedback
group by user_id, coalesce(label, 'Mixed'), symbol;
