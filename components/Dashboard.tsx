'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, BellRing, BookOpen, CheckCircle2, ChevronDown, Clock3, DatabaseZap, Flame, History, Info, Lock, Mail, Moon, PlusCircle, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Star, Target, ThumbsDown, ThumbsUp, Trophy, TrendingUp, UserRound, Volume2, VolumeX, Zap } from 'lucide-react';
import { AssetSignal, Experience, TraderMode, buildSignals, formatPrice } from '@/lib/signals';
import { BUILD } from '@/lib/build';
import { MIDNIGHT_NETWORK_DEFAULT_WATCHLIST, normalizeAssetSymbol } from '@/lib/assets';
import { buildMidnightNetworkInsight, midnightAssetRole } from '@/lib/midnight-network';
import { MarketCondition, TrustSnapshot, getMarketSnapshot } from '@/lib/market';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { PerformanceOutcome, SignalResult, buildProPerformanceAnalytics, buildSignalReceiptText, buildSignalResults, formatHoldTime, outcomeLabel, summarizePerformance } from '@/lib/performance';
import { buildPersonalIntelligenceProfile, type UserIntelligenceProfile } from '@/lib/personalization';

type AccessMode = 'unset' | 'guest' | 'early';
type Plan = 'free' | 'pro';
type SignalOutcome = 'Worked' | 'Failed' | 'Neutral';
type FeedbackAction = 'acted' | 'ignored';
type FeedbackOutcome = 'win' | 'loss' | 'neutral' | null;
type SignalFeedback = { signalId: string; symbol: string; action: FeedbackAction; outcome: FeedbackOutcome; note?: string; createdAt: string; source?: 'database' | 'local' };
type FeedbackStats = { total: number; acted: number; ignored: number; wins: number; losses: number; neutrals: number; winRate: number; latest?: SignalFeedback };
type FeedbackMap = Record<string, SignalFeedback[]>;
type PerformanceRow = { label: string; total: number; acted: number; ignored: number; wins: number; losses: number; neutrals: number; winRate: number; actionRate: number };
type PerformanceEngine = { total: number; acted: number; ignored: number; wins: number; losses: number; neutrals: number; winRate: number; actionRate: number; bestType: PerformanceRow | null; byType: PerformanceRow[]; bySymbol: PerformanceRow[]; informedConfidence: number; sampleSize: number };
type ApiPerformanceEngine = PerformanceEngine & { source?: string };
type ConversionEventType = 'global_added_to_watchlist' | 'global_tracked' | 'global_upgrade_clicked';
type ConversionEvent = { type: ConversionEventType; symbol: string; gap: number; createdAt: string; source?: 'database' | 'local' };
type RetentionEventType = 'digest_viewed' | 'weekly_report_viewed' | 'missed_opportunity_clicked' | 'digest_upgrade_clicked';
type RetentionEvent = { type: RetentionEventType; symbol?: string; createdAt: string; source?: 'database' | 'local'; metadata?: Record<string, unknown> };
type RecommendationFeedbackAction = 'more' | 'less' | 'hide';
type RecommendationFeedback = { symbol: string; action: RecommendationFeedbackAction; createdAt: string; source?: 'database' | 'local'; metadata?: Record<string, unknown> };
type RetentionDigest = { personalSignal: AssetSignal; globalSignal: AssetSignal; gap: number; winRate: number; missedOpportunity: boolean; action: string; weeklyNote: string; events: number };
type NotificationPreferences = { emailDailyDigest: boolean; emailWeeklyReport: boolean; pushDailyDigest: boolean; pushWeeklyReport: boolean; pushMissedOpportunity: boolean; quietHoursStart: string; quietHoursEnd: string };
type NotificationStatus = { email: 'idle' | 'sent' | 'queued' | 'error'; push: 'idle' | 'enabled' | 'queued' | 'blocked' | 'error'; message: string };
const defaultNotificationPreferences: NotificationPreferences = { emailDailyDigest: true, emailWeeklyReport: true, pushDailyDigest: false, pushWeeklyReport: false, pushMissedOpportunity: true, quietHoursStart: '22:00', quietHoursEnd: '08:00' };
type SignalHistoryItem = AssetSignal & { outcome: SignalOutcome; note: string; age: string };
type AlertPreferenceKey = 'highConfidenceAlerts' | 'dailyRecap' | 'settlementAlerts' | 'proOnlyAlerts';
type AlertPreferences = Record<AlertPreferenceKey, boolean>;
type AlertEventPreview = { id: string; title: string; body: string; type: string; createdAt: string };
type WatchlistPreference = { symbol: string; highConfidenceAlerts: boolean; settlementAlerts: boolean; isPrimary: boolean };
type WatchlistApiItem = { symbol: string; highConfidenceAlerts?: boolean; settlementAlerts?: boolean; isPrimary?: boolean };
type DailyRecapPreview = { body: string; totalClosed: number; wins: number; losses: number; winRate: number; avgReturn: number; best: string | null } | null;
type AuthUser = { id: string; email: string } | null;
type Stored = {
  agreed?: boolean;
  accessMode?: AccessMode;
  earlyEmail?: string;
  mode?: TraderMode;
  experience?: Experience;
  currency?: string;
  sound?: boolean;
  watchlist?: string[];
  watchlistPreferences?: WatchlistPreference[];
  selected?: string;
  lastTop?: AssetSignal;
  visits?: number;
  ritual?: RitualState;
};

type RitualState = { topSignal: boolean; confidence: boolean; watchlist: boolean; market: boolean };

const storageKey = 'midnight-signal-v16';
const currencies = ['USD', 'CAD', 'EUR'];
const defaultRitual: RitualState = { topSignal: false, confidence: false, watchlist: false, market: false };
const defaultAlertPreferences: AlertPreferences = { highConfidenceAlerts: true, dailyRecap: true, settlementAlerts: true, proOnlyAlerts: true };

function readStored(): Stored {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
}
function writeStored(next: Stored) {
  if (typeof window !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(next));
}
function labelClass(label: AssetSignal['label']) {
  if (label === 'Bullish') return 'text-signal-green bg-signal-green/10 border-signal-green/30';
  if (label === 'Bearish') return 'text-signal-red bg-signal-red/10 border-signal-red/30';
  return 'text-signal-amber bg-signal-amber/10 border-signal-amber/30';
}
function conditionCopy(condition: MarketCondition) {
  return condition === 'volatile' ? 'Fast moves, wider risk bands' : condition === 'active' ? 'Readable movement, good for learning' : 'Slower tape, fewer strong confirmations';
}
function outcomeForSignal(signal: AssetSignal): SignalOutcome {
  const move = signal.change24h;
  if (signal.label === 'Bullish') return move >= 1.5 ? 'Worked' : move <= -1 ? 'Failed' : 'Neutral';
  if (signal.label === 'Bearish') return move <= -1.5 ? 'Worked' : move >= 1 ? 'Failed' : 'Neutral';
  return Math.abs(move) <= 1.8 ? 'Neutral' : move > 0 ? 'Worked' : 'Failed';
}
function outcomeClass(outcome: SignalOutcome) {
  if (outcome === 'Worked') return 'text-signal-green bg-signal-green/10 border-signal-green/30';
  if (outcome === 'Failed') return 'text-signal-red bg-signal-red/10 border-signal-red/30';
  return 'text-signal-amber bg-signal-amber/10 border-signal-amber/30';
}
function buildSignalHistory(signals: AssetSignal[]): SignalHistoryItem[] {
  const ages = ['Last 24h', 'Yesterday', '2 days ago', '3 days ago', '4 days ago', '5 days ago'];
  return signals.slice(0, 6).map((signal, index) => {
    const outcome = outcomeForSignal(signal);
    const note = outcome === 'Worked'
      ? signal.symbol + ' followed its ' + signal.label.toLowerCase() + ' posture enough to validate the read.'
      : outcome === 'Failed'
        ? signal.symbol + ' moved against the signal, which is why confidence review matters.'
        : signal.symbol + ' stayed mixed, so the signal remains in watch-and-learn mode.';
    return { ...signal, outcome, note, age: ages[index] || 'Recent' };
  });
}

function signalId(signal: AssetSignal, mode: TraderMode) {
  return [mode, signal.symbol, signal.label, signal.confidence].join('-').toLowerCase();
}
function feedbackStats(items: SignalFeedback[]): FeedbackStats {
  const total = items.length;
  const acted = items.filter(item => item.action === 'acted').length;
  const ignored = items.filter(item => item.action === 'ignored').length;
  const wins = items.filter(item => item.outcome === 'win').length;
  const losses = items.filter(item => item.outcome === 'loss').length;
  const neutrals = items.filter(item => item.outcome === 'neutral').length;
  const decisive = wins + losses;
  return { total, acted, ignored, wins, losses, neutrals, winRate: decisive ? Math.round((wins / decisive) * 100) : 0, latest: items[0] };
}
function flattenFeedback(map: FeedbackMap) {
  return Object.values(map).flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function buildPerformanceRow(label: string, items: SignalFeedback[]): PerformanceRow {
  const stats = feedbackStats(items);
  return { label, total: stats.total, acted: stats.acted, ignored: stats.ignored, wins: stats.wins, losses: stats.losses, neutrals: stats.neutrals, winRate: stats.winRate, actionRate: stats.total ? Math.round((stats.acted / stats.total) * 100) : 0 };
}
function signalTypeFromId(id: string) {
  const parts = id.split('-');
  return parts.length >= 3 ? parts[2].replace(/^./, char => char.toUpperCase()) : 'Mixed';
}
function buildPerformanceEngine(map: FeedbackMap, currentSignal: AssetSignal, mode: TraderMode): PerformanceEngine {
  const all = flattenFeedback(map);
  const overall = buildPerformanceRow('All signals', all);
  const bySymbol = Object.entries(all.reduce<Record<string, SignalFeedback[]>>((acc, item) => { (acc[item.symbol] ||= []).push(item); return acc; }, {})).map(([label, items]) => buildPerformanceRow(label, items)).sort((a, b) => b.winRate - a.winRate || b.total - a.total);
  const byType = Object.entries(all.reduce<Record<string, SignalFeedback[]>>((acc, item) => { const key = signalTypeFromId(item.signalId); (acc[key] ||= []).push(item); return acc; }, {})).map(([label, items]) => buildPerformanceRow(label, items)).sort((a, b) => b.winRate - a.winRate || b.total - a.total);
  const currentId = signalId(currentSignal, mode);
  const currentStats = feedbackStats(map[currentId] || []);
  const symbolStats = bySymbol.find(row => row.label === currentSignal.symbol);
  const sampleSize = currentStats.total || symbolStats?.total || overall.total;
  const performanceLift = currentStats.winRate ? currentStats.winRate : symbolStats?.winRate || overall.winRate;
  const informedConfidence = sampleSize >= 3 && performanceLift ? Math.max(35, Math.min(94, Math.round((currentSignal.confidence * 0.65) + (performanceLift * 0.35)))) : currentSignal.confidence;
  return { total: overall.total, acted: overall.acted, ignored: overall.ignored, wins: overall.wins, losses: overall.losses, neutrals: overall.neutrals, winRate: overall.winRate, actionRate: overall.actionRate, bestType: byType[0] || null, byType, bySymbol, informedConfidence, sampleSize };
}
function readFeedback(): FeedbackMap {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('midnight-signal-feedback-v16') || '{}'); } catch { return {}; }
}
function writeFeedback(next: FeedbackMap) {
  if (typeof window !== 'undefined') localStorage.setItem('midnight-signal-feedback-v16', JSON.stringify(next));
}
function readConversionEvents(): ConversionEvent[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('midnight-signal-conversion-v16') || '[]'); } catch { return []; }
}
function writeConversionEvents(next: ConversionEvent[]) {
  if (typeof window !== 'undefined') localStorage.setItem('midnight-signal-conversion-v16', JSON.stringify(next));
}
function readRetentionEvents(): RetentionEvent[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('midnight-signal-retention-v16') || '[]'); } catch { return []; }
}
function writeRetentionEvents(next: RetentionEvent[]) {
  if (typeof window !== 'undefined') localStorage.setItem('midnight-signal-retention-v16', JSON.stringify(next));
}
function readRecommendationFeedback(): RecommendationFeedback[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('midnight-signal-recommendation-feedback-v16_1') || '[]'); } catch { return []; }
}
function writeRecommendationFeedback(next: RecommendationFeedback[]) {
  if (typeof window !== 'undefined') localStorage.setItem('midnight-signal-recommendation-feedback-v16_1', JSON.stringify(next));
}
function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return defaultNotificationPreferences;
  try { return { ...defaultNotificationPreferences, ...JSON.parse(localStorage.getItem('midnight-signal-notifications-v16') || '{}') }; } catch { return defaultNotificationPreferences; }
}
function writeNotificationPreferences(next: NotificationPreferences) {
  if (typeof window !== 'undefined') localStorage.setItem('midnight-signal-notifications-v16', JSON.stringify(next));
}
function buildRetentionDigest(personalSignal: AssetSignal, globalSignal: AssetSignal, gap: number, summary: ReturnType<typeof summarizePerformance>, feedbackCount: number, conversionCount: number): RetentionDigest {
  const missedOpportunity = globalSignal.symbol !== personalSignal.symbol && gap >= 4;
  const action = missedOpportunity
    ? `Review ${globalSignal.symbol}: it is outperforming your watchlist leader by ${gap} confidence points.`
    : `Stay focused on ${personalSignal.symbol}: your watchlist and global signal stack are aligned enough today.`;
  const weeklyNote = summary.totalSignals
    ? `${summary.winRate}% win rate across ${summary.totalSignals} recent receipts, with ${feedbackCount} feedback events captured.`
    : 'No settled receipts yet. Start by tracking one signal and marking the outcome.';
  return { personalSignal, globalSignal, gap, winRate: summary.winRate, missedOpportunity, action, weeklyNote, events: feedbackCount + conversionCount };
}

function journeyLevel(visits: number, watchlistCount: number, completed: number) {
  const score = visits * 12 + watchlistCount * 8 + completed * 10;
  if (score >= 90) return { title: 'Advanced Signal Reader', stage: 4, progress: 100, note: 'You are building a repeatable signal-reading habit.' };
  if (score >= 60) return { title: 'Confident Reader', stage: 3, progress: 76, note: 'You are connecting confidence, trend, and market condition.' };
  if (score >= 30) return { title: 'Signal Reader', stage: 2, progress: 48, note: 'You are starting to recognize why signals move.' };
  return { title: 'Beginner', stage: 1, progress: 22, note: 'Start with the top signal, confidence, and glossary.' };
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [confirmedLearning, setConfirmedLearning] = useState(false);
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode>('unset');
  const [earlyEmail, setEarlyEmail] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [plan, setPlan] = useState<Plan>('free');
  const [authMessage, setAuthMessage] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [checkoutSyncing, setCheckoutSyncing] = useState(false);
  const checkoutReturnHandled = useRef(false);
  const [mode, setMode] = useState<TraderMode>('swing');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [currency, setCurrency] = useState('USD');
  const [sound, setSound] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([...MIDNIGHT_NETWORK_DEFAULT_WATCHLIST]);
  const [watchlistPreferences, setWatchlistPreferences] = useState<WatchlistPreference[]>([]);
  const [watchlistInput, setWatchlistInput] = useState('');
  const [watchlistMessage, setWatchlistMessage] = useState('');
  const [watchlistSource, setWatchlistSource] = useState<'local' | 'database'>('local');
  const [selected, setSelected] = useState('ADA');
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState('');
  const [signalChanged, setSignalChanged] = useState(false);
  const [visits, setVisits] = useState(1);
  const [ritual, setRitual] = useState<RitualState>(defaultRitual);
  const [snapshot, setSnapshot] = useState<TrustSnapshot>(() => {
    const signals = buildSignals('swing');
    return { signals, source: 'Fallback demo data', updatedAt: BUILD.deployedAt, marketCondition: 'active', confidenceReason: `${signals[0].symbol} leads because trend and momentum are currently the strongest combined readings.` };
  });
  const [loadingLive, setLoadingLive] = useState(false);
  const [persistentResults, setPersistentResults] = useState<SignalResult[]>([]);
  const [performanceSource, setPerformanceSource] = useState<'database' | 'simulated'>('simulated');
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferences>(defaultAlertPreferences);
  const [alertEvents, setAlertEvents] = useState<AlertEventPreview[]>([]);
  const [dailyRecap, setDailyRecap] = useState<DailyRecapPreview>(null);
  const [lastTop, setLastTop] = useState<AssetSignal | undefined>();
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [apiPerformance, setApiPerformance] = useState<ApiPerformanceEngine | null>(null);
  const [conversionEvents, setConversionEvents] = useState<ConversionEvent[]>([]);
  const [retentionEvents, setRetentionEvents] = useState<RetentionEvent[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>({ email: 'idle', push: 'idle', message: 'Notifications are ready to connect to your retention snapshots.' });
  const [recommendationFeedback, setRecommendationFeedback] = useState<RecommendationFeedback[]>([]);
  const [recommendationMessage, setRecommendationMessage] = useState('');

  function openGlossaryTerm(term: string) {
    setActiveGlossaryTerm(term);
    setGlossaryOpen(true);
    if (authUser?.id) {
      fetch('/api/learning/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, term, source: 'inline_glossary' })
      }).catch(() => undefined);
    }
  }

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const stored = readStored();
    setAgreed(Boolean(stored.agreed));
    setAccessMode(stored.accessMode || 'unset');
    setEarlyEmail(stored.earlyEmail || '');
    setMode(stored.mode || 'swing');
    setExperience(stored.experience || 'beginner');
    setCurrency(stored.currency || 'USD');
    setSound(Boolean(stored.sound));
    setWatchlist(stored.watchlist?.length ? stored.watchlist.map(normalizeAssetSymbol) : [...MIDNIGHT_NETWORK_DEFAULT_WATCHLIST]);
    setWatchlistPreferences(stored.watchlistPreferences || []);
    setSelected(stored.selected ? normalizeAssetSymbol(stored.selected) : 'ADA');
    setLastTop(stored.lastTop);
    setVisits((stored.visits || 0) + 1);
    setRitual(stored.ritual || defaultRitual);
    setFeedback(readFeedback());
    setConversionEvents(readConversionEvents());
    setRetentionEvents(readRetentionEvents());
    setNotificationPreferences(readNotificationPreferences());
    setRecommendationFeedback(readRecommendationFeedback());
  }, []);

  useEffect(() => {
    writeStored({ agreed, accessMode, earlyEmail, mode, experience, currency, sound, watchlist, watchlistPreferences, selected, lastTop: snapshot.signals[0], visits, ritual });
  }, [agreed, accessMode, earlyEmail, mode, experience, currency, sound, watchlist, watchlistPreferences, selected, snapshot, visits, ritual]);

  async function refreshMarket() {
    setLoadingLive(true);
    const next = await getMarketSnapshot(mode, currency, lastTop);
    setSnapshot(next);
    setLastTop(next.signals[0]);

    fetch('/api/signals/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: next.signals, mode, userId: authUser?.id || null })
    }).catch(() => undefined);

    setLoadingLive(false);
  }

  useEffect(() => { refreshMarket(); }, [mode, currency]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthMessage('Supabase env vars are not set yet. Guest mode still works.');
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user?.email) {
        setAuthUser({ id: user.id, email: user.email });
        setAccessMode('early');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setAuthUser(user?.email ? { id: user.id, email: user.email } : null);
      if (user?.email) setAccessMode('early');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function refreshPlan(): Promise<Plan> {
    const email = authUser?.email || earlyEmail || authEmail;
    const userId = authUser?.id;
    if (!email && !userId) { setPlan('free'); return 'free'; }
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      });
      const data = await response.json().catch(() => ({}));
      const nextPlan: Plan = data.plan === 'pro' ? 'pro' : 'free';
      setPlan(nextPlan);
      if (nextPlan === 'pro') setAuthMessage('Pro active — deeper signal intelligence is unlocked.');
      return nextPlan;
    } catch {
      setPlan('free');
      return 'free';
    }
  }

  useEffect(() => { refreshPlan(); }, [authUser, earlyEmail, authEmail]);

  const watchlistLimit = plan === 'pro' ? 50 : 3;

  useEffect(() => {
    const params = new URLSearchParams();
    if (authUser?.id) params.set('userId', authUser.id);
    fetch('/api/alerts/preferences?' + params.toString())
      .then(response => response.ok ? response.json() : Promise.reject(new Error('preferences unavailable')))
      .then(data => setAlertPreferences({ ...defaultAlertPreferences, ...(data.preferences || {}) }))
      .catch(() => setAlertPreferences(defaultAlertPreferences));

    const eventParams = new URLSearchParams(params);
    eventParams.set('limit', '8');
    fetch('/api/alerts/events?' + eventParams.toString())
      .then(response => response.ok ? response.json() : Promise.reject(new Error('alerts unavailable')))
      .then(data => setAlertEvents(Array.isArray(data.events) ? data.events : []))
      .catch(() => setAlertEvents([]));

    const recapParams = new URLSearchParams(params);
    recapParams.set('dryRun', 'true');
    fetch('/api/cron/daily-recap?' + recapParams.toString())
      .then(response => response.ok ? response.json() : Promise.reject(new Error('recap unavailable')))
      .then(data => setDailyRecap(data.recap || null))
      .catch(() => setDailyRecap(null));
  }, [authUser?.id, performanceSource, snapshot.updatedAt]);

  useEffect(() => {
    if (!authUser?.id) return;
    fetch('/api/watchlist?userId=' + encodeURIComponent(authUser.id))
      .then(response => response.ok ? response.json() : Promise.reject(new Error('watchlist unavailable')))
      .then(data => {
        const items = Array.isArray(data.items) ? data.items as WatchlistApiItem[] : [];
        if (items.length) {
          const symbols = items.map(item => item.symbol).filter(Boolean);
          setWatchlist(symbols);
          setWatchlistPreferences(items.map(item => ({ symbol: item.symbol, highConfidenceAlerts: item.highConfidenceAlerts ?? true, settlementAlerts: item.settlementAlerts ?? true, isPrimary: item.isPrimary ?? false })));
          setWatchlistSource('database');
        }
      })
      .catch(() => setWatchlistSource('local'));
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authUser.id, symbols: watchlist, preferences: watchlistPreferences })
    }).catch(() => undefined);
  }, [authUser?.id, watchlist, watchlistPreferences]);

  useEffect(() => {
    if (watchlist.length <= watchlistLimit) return;
    setWatchlist(list => list.slice(0, watchlistLimit));
    setWatchlistMessage(plan === 'pro' ? '' : 'Free watchlists are capped at 3 symbols. Upgrade to Pro for unlimited personalization.');
  }, [plan, watchlist.length, watchlistLimit]);

  useEffect(() => {
    setWatchlistPreferences(current => {
      const existing = new Map(current.map(item => [item.symbol, item]));
      return watchlist.map((symbol, index) => existing.get(symbol) || { symbol, highConfidenceAlerts: true, settlementAlerts: true, isPrimary: index === 0 });
    });
  }, [watchlist]);

  useEffect(() => {
    if (watchlist.includes(selected) || !watchlist.length) return;
    setSelected(watchlist[0]);
  }, [watchlist, selected]);

  useEffect(() => {
    if (!watchlistMessage) return;
    const id = setTimeout(() => setWatchlistMessage(''), 4000);
    return () => clearTimeout(id);
  }, [watchlistMessage]);

  useEffect(() => {
    if (typeof window === 'undefined' || checkoutReturnHandled.current) return;
    const params = new URLSearchParams(window.location.search);

    if (params.get('checkout') === 'success') {
      checkoutReturnHandled.current = true;
      setCheckoutSyncing(true);
      setAuthMessage('Finalizing your Pro access…');
      window.history.replaceState({}, '', window.location.pathname);

      let attempts = 0;
      let interval: ReturnType<typeof setInterval> | undefined;
      const syncPlan = async () => {
        attempts += 1;
        const nextPlan = await refreshPlan();
        if (nextPlan === 'pro') {
          setCheckoutSyncing(false);
          setAuthMessage('Pro active — deeper signal intelligence is unlocked.');
          if (interval) clearInterval(interval);
          return;
        }
        if (attempts >= 10) {
          setCheckoutSyncing(false);
          setAuthMessage('Payment received. Pro is still syncing — refresh once or try Sync Plan in a few seconds.');
          if (interval) clearInterval(interval);
        }
      };

      syncPlan();
      interval = setInterval(syncPlan, 1500);
      return () => { if (interval) clearInterval(interval); };
    }

    if (params.get('checkout') === 'cancelled') {
      checkoutReturnHandled.current = true;
      setAuthMessage('Checkout cancelled. Your Free Plan is still active.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [authUser, earlyEmail, authEmail]);

  const signals = snapshot.signals;
  const pinned = useMemo(() => signals.filter(s => watchlist.includes(s.symbol)), [signals, watchlist]);
  const personalizedSignals = pinned.length ? pinned : signals.slice(0, 3);
  const userTop = personalizedSignals[0] || signals[0];
  const globalTop = signals[0] || userTop;
  const top = userTop;
  const topSignalGap = Math.max(0, (globalTop?.confidence || 0) - (userTop?.confidence || 0));
  const globalTopIsDifferent = Boolean(globalTop && userTop && globalTop.symbol !== userTop.symbol);
  const shouldExposeGlobalTop = globalTopIsDifferent && (topSignalGap >= 4 || globalTop.confidence >= 70 || plan === 'pro');
  const active = signals.find(s => s.symbol === selected) || top;
  const watchlistLocked = plan !== 'pro' && watchlist.length >= watchlistLimit;
  const completedRitual = Object.values(ritual).filter(Boolean).length;
  const journey = journeyLevel(visits, watchlist.length, completedRitual);
  const signalHistory = useMemo(() => buildSignalHistory(signals), [signals]);
  const simulatedPerformanceResults = useMemo(() => buildSignalResults(signals, mode), [signals, mode]);
  const performanceResults = persistentResults.length ? persistentResults : simulatedPerformanceResults;
  const personalizedPerformanceResults = useMemo(() => performanceResults.filter(result => watchlist.includes(result.symbol)), [performanceResults, watchlist]);
  const watchlistSummary = useMemo(() => summarizePerformance(personalizedPerformanceResults.length ? personalizedPerformanceResults : performanceResults), [personalizedPerformanceResults, performanceResults]);
  const userTopSummary = useMemo(() => summarizePerformance(performanceResults.filter(result => result.symbol === userTop.symbol)), [performanceResults, userTop.symbol]);
  const globalTopSummary = useMemo(() => summarizePerformance(performanceResults.filter(result => result.symbol === globalTop.symbol)), [performanceResults, globalTop.symbol]);
  const performanceSummary = useMemo(() => summarizePerformance(performanceResults), [performanceResults]);
  const proAnalytics = useMemo(() => buildProPerformanceAnalytics(performanceResults), [performanceResults]);
  const topOutcome = outcomeForSignal(top);
  const retentionScore = Math.min(100, journey.progress + Math.round(performanceSummary.winRate / 8) + (plan === 'pro' ? 8 : 0));
  const tonightPlan = [
    `Review ${top.symbol} first because it leads your watchlist stack.`,
    `Confirm the ${snapshot.marketCondition} market condition before acting on momentum.`,
    performanceSummary.currentStreakType === 'win' ? 'Protect the current receipt streak with smaller, cleaner decisions.' : 'Use the latest receipt notes to tighten your next signal review.',
    plan === 'pro' ? 'Compare Pro analytics by symbol before changing your watchlist priority.' : 'Free plan: track your watchlist top signal, then compare it against the global discovery preview.'
  ];
  const riskPosture = top.confidence >= 75 && snapshot.marketCondition !== 'volatile' ? 'Constructive' : snapshot.marketCondition === 'volatile' ? 'Cautious' : 'Balanced';
  const allFeedback = useMemo(() => flattenFeedback(feedback), [feedback]);
  const topSignalId = signalId(top, mode);
  const topFeedbackStats = useMemo(() => feedbackStats(feedback[topSignalId] || []), [feedback, topSignalId]);
  const globalFeedbackStats = useMemo(() => feedbackStats(allFeedback), [allFeedback]);
  const localPerformanceEngine = useMemo(() => buildPerformanceEngine(feedback, top, mode), [feedback, top, mode]);
  const performanceEngine = apiPerformance && apiPerformance.total >= localPerformanceEngine.total ? apiPerformance : localPerformanceEngine;
  const learningLoopScore = Math.min(100, retentionScore + Math.min(18, globalFeedbackStats.total * 3) + (globalFeedbackStats.winRate ? Math.round(globalFeedbackStats.winRate / 10) : 0));
  const globalConversionCount = conversionEvents.filter(event => event.symbol === globalTop.symbol).length;
  const retentionDigest = useMemo(() => buildRetentionDigest(userTop, globalTop, topSignalGap, performanceSummary, globalFeedbackStats.total, conversionEvents.length), [userTop, globalTop, topSignalGap, performanceSummary, globalFeedbackStats.total, conversionEvents.length]);
  const midnightNetwork = useMemo(() => buildMidnightNetworkInsight(signals), [signals]);
  const missedOpportunityCount = retentionEvents.filter(event => event.type === 'missed_opportunity_clicked').length;
  const personalIntelligence = useMemo(() => buildPersonalIntelligenceProfile({ signals, watchlist, feedback: allFeedback, conversionEvents, retentionEvents, recommendationFeedback, performanceResults, mode }), [signals, watchlist, allFeedback, conversionEvents, retentionEvents, recommendationFeedback, performanceResults, mode]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (authUser?.id) params.set('userId', authUser.id);
    params.set('limit', '60');
    fetch('/api/signals/results?' + params.toString())
      .then(response => response.ok ? response.json() : Promise.reject(new Error('results unavailable')))
      .then(data => {
        if (Array.isArray(data.results) && data.results.length) {
          setPersistentResults(data.results);
          setPerformanceSource('database');
        } else {
          setPersistentResults([]);
          setPerformanceSource('simulated');
        }
      })
      .catch(() => {
        setPersistentResults([]);
        setPerformanceSource('simulated');
      });
  }, [authUser?.id, snapshot.updatedAt]);

  useEffect(() => {
    if (!authUser?.id) { setApiPerformance(null); return; }
    const params = new URLSearchParams({ userId: authUser.id, mode, symbol: top.symbol, signalId: signalId(top, mode) });
    fetch('/api/signals/performance?' + params.toString())
      .then(response => response.ok ? response.json() : Promise.reject(new Error('performance unavailable')))
      .then(data => setApiPerformance(data.performance || null))
      .catch(() => setApiPerformance(null));
  }, [authUser?.id, mode, top.symbol, top.confidence, feedback]);

  useEffect(() => {
    setSignalChanged(true);
    const id = setTimeout(() => setSignalChanged(false), 900);
    return () => clearTimeout(id);
  }, [top.symbol, top.confidence, mode]);


  async function recordSignalFeedback(signal: AssetSignal, action: FeedbackAction, outcome: FeedbackOutcome = null) {
    const id = signalId(signal, mode);
    const item: SignalFeedback = { signalId: id, symbol: signal.symbol, action, outcome, createdAt: new Date().toISOString(), source: authUser?.id ? 'database' : 'local' };
    const next = { ...feedback, [id]: [item, ...(feedback[id] || [])].slice(0, 20) };
    setFeedback(next);
    writeFeedback(next);
    setFeedbackMessage(action === 'ignored' ? signal.symbol + ' ignored — learning loop updated.' : signal.symbol + ' marked as ' + (outcome || 'acted') + '.');
    if (authUser?.id) {
      fetch('/api/signals/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, signalId: id, signal, mode, action, outcome })
      }).then(response => response.ok ? response.json() : Promise.reject(new Error('feedback unavailable'))).then(() => {
        setFeedbackMessage(signal.symbol + ' feedback saved to Supabase.');
      }).catch(() => {
        setFeedbackMessage(signal.symbol + ' feedback saved locally. Add Supabase SQL to sync it.');
      });
    }
  }

  function recordConversionEvent(type: ConversionEventType, signal: AssetSignal) {
    const item: ConversionEvent = { type, symbol: signal.symbol, gap: topSignalGap, createdAt: new Date().toISOString(), source: authUser?.id ? 'database' : 'local' };
    const next = [item, ...conversionEvents].slice(0, 80);
    setConversionEvents(next);
    writeConversionEvents(next);
    if (authUser?.id) {
      fetch('/api/signals/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, type, symbol: signal.symbol, signalId: signalId(signal, mode), gap: topSignalGap, mode })
      }).catch(() => undefined);
    }
  }
  function addGlobalTopToWatchlist() {
    recordConversionEvent('global_added_to_watchlist', globalTop);
    if (!watchlist.includes(globalTop.symbol)) toggleWatch(globalTop.symbol);
    setSelected(globalTop.symbol);
    setWatchlistMessage(globalTop.symbol + ' added from Global Top Signal discovery. It now belongs to your system.');
  }
  function trackGlobalSignal() {
    recordConversionEvent('global_tracked', globalTop);
    setSelected(globalTop.symbol);
    markRitual('topSignal');
  }

  function recordRecommendationFeedback(symbol: string, action: RecommendationFeedbackAction, metadata?: Record<string, unknown>) {
    const normalized = normalizeAssetSymbol(symbol);
    const item: RecommendationFeedback = { symbol: normalized, action, metadata, createdAt: new Date().toISOString(), source: authUser?.id ? 'database' : 'local' };
    const next = [item, ...recommendationFeedback].slice(0, 120);
    setRecommendationFeedback(next);
    writeRecommendationFeedback(next);
    setRecommendationMessage(action === 'more' ? `Showing more signals like ${normalized}.` : action === 'less' ? `Showing fewer signals like ${normalized}.` : `${normalized} suppressed from recommendations.`);
    if (authUser?.id) {
      fetch('/api/personalization/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, action, symbol: normalized, metadata: { mode, ...metadata } })
      }).catch(() => undefined);
      fetch('/api/personalization/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, eventType: action === 'more' ? 'recommendation_more_like_this' : action === 'less' ? 'recommendation_less_like_this' : 'recommendation_not_interested', symbol: normalized, metadata: { mode, ...metadata } })
      }).catch(() => undefined);
    }
  }

  function addSymbolToWatchlist(symbol: string, message: string) {
    const normalized = normalizeAssetSymbol(symbol);
    if (!watchlist.includes(normalized)) toggleWatch(normalized);
    setSelected(normalized);
    setWatchlistMessage(normalized + ' added from ' + message + '.');
    if (authUser?.id) {
      fetch('/api/personalization/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, eventType: 'recommendation_added_to_watchlist', symbol: normalized, metadata: { mode } })
      }).catch(() => undefined);
    }
  }

  function recordRetentionEvent(type: RetentionEventType, symbol?: string, metadata?: Record<string, unknown>) {
    const item: RetentionEvent = { type, symbol, metadata, createdAt: new Date().toISOString(), source: authUser?.id ? 'database' : 'local' };
    const next = [item, ...retentionEvents].slice(0, 100);
    setRetentionEvents(next);
    writeRetentionEvents(next);
    if (authUser?.id) {
      fetch('/api/retention/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, type, symbol, metadata })
      }).catch(() => undefined);
    }
  }

  function reviewMissedOpportunity() {
    recordRetentionEvent('missed_opportunity_clicked', globalTop.symbol, { gap: topSignalGap, userTop: userTop.symbol });
    if (notificationPreferences.pushMissedOpportunity) queueNotification('missed_opportunity', ['push']);
    trackGlobalSignal();
  }

  function updateNotificationPreference<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    const next = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(next);
    writeNotificationPreferences(next);
    if (authUser?.id) {
      fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, preferences: next })
      }).catch(() => undefined);
    }
  }

  async function queueNotification(type: 'daily_digest' | 'weekly_report' | 'missed_opportunity', channels: ('email' | 'push')[]) {
    const report = { winRate: performanceSummary.winRate, acted: performanceEngine.acted, ignored: performanceEngine.ignored, wins: performanceEngine.wins, losses: performanceEngine.losses, neutral: performanceEngine.neutrals, conversions: conversionEvents.length, missedOpportunities: missedOpportunityCount, bestAsset: userTop.symbol };
    setNotificationStatus(status => ({ ...status, message: 'Preparing notification from latest retention snapshot...' }));
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser?.id || null, email: authEmail || earlyEmail || authUser?.email || null, type, channels, personalSignal: userTop, globalSignal: globalTop, report })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Notification failed');
      setNotificationStatus(status => ({ email: channels.includes('email') ? 'queued' : status.email, push: channels.includes('push') ? 'queued' : status.push, message: channels.join(' + ') + ' notification prepared.' }));
      recordRetentionEvent(type === 'weekly_report' ? 'weekly_report_viewed' : type === 'missed_opportunity' ? 'missed_opportunity_clicked' : 'digest_viewed', type === 'missed_opportunity' ? globalTop.symbol : userTop.symbol, { channels });
    } catch {
      setNotificationStatus(status => ({ ...status, email: channels.includes('email') ? 'error' : status.email, push: channels.includes('push') ? 'error' : status.push, message: 'Notification could not be delivered yet. Check Supabase and email provider settings.' }));
    }
  }

  async function enableBrowserPush() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationStatus(status => ({ ...status, push: 'blocked', message: 'This browser does not support notifications.' }));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setNotificationStatus(status => ({ ...status, push: 'blocked', message: 'Push permission was not granted.' }));
      return;
    }
    updateNotificationPreference('pushDailyDigest', true);
    setNotificationStatus(status => ({ ...status, push: 'enabled', message: 'Browser push is enabled locally. Add VAPID/web-push delivery when ready for production pushes.' }));
  }

  function markRitual(key: keyof RitualState) { setRitual(r => ({ ...r, [key]: true })); }
  function toggleWatch(symbol: string) {
    setWatchlist(list => {
      if (list.includes(symbol)) return list.filter(item => item !== symbol);
      if (plan !== 'pro' && list.length >= watchlistLimit) {
        setWatchlistMessage('Free watchlists are capped at 3 symbols. Upgrade to Pro for unlimited personalization.');
        return list;
      }
      return [symbol, ...list];
    });
    markRitual('watchlist');
  }
  function addWatchlistSymbol() {
    const symbol = normalizeAssetSymbol(watchlistInput);
    if (!symbol) return;
    const exists = signals.some(signal => signal.symbol === symbol);
    if (!exists) { setWatchlistMessage(symbol + ' is not in the current signal universe yet.'); return; }
    if (watchlist.includes(symbol)) { setSelected(symbol); setWatchlistInput(''); return; }
    if (plan !== 'pro' && watchlist.length >= watchlistLimit) { setWatchlistMessage('Free watchlists are capped at 3 symbols. Upgrade to Pro for unlimited personalization.'); return; }
    setWatchlist(list => [symbol, ...list]);
    setSelected(symbol);
    setWatchlistInput('');
    markRitual('watchlist');
  }
  function updateSymbolPreference(symbol: string, key: 'highConfidenceAlerts' | 'settlementAlerts', value: boolean) {
    setWatchlistPreferences(current => current.map(item => item.symbol === symbol ? { ...item, [key]: value } : item));
  }
  function setPrimaryWatchlistSymbol(symbol: string) {
    setWatchlist(list => [symbol, ...list.filter(item => item !== symbol)]);
    setSelected(symbol);
    setWatchlistPreferences(current => current.map(item => ({ ...item, isPrimary: item.symbol === symbol })));
  }
  function selectSignal(symbol: string) { setSelected(symbol); markRitual('topSignal'); }
  function acceptAgreement() { if (confirmedLearning && confirmedRisk) setAgreed(true); }
  function joinEarlyAccess() { setAccessMode('early'); }
  async function sendMagicLink() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setAuthMessage('Add Supabase env vars in Vercel to enable magic links.'); return; }
    const email = authEmail || earlyEmail;
    if (!email.includes('@')) { setAuthMessage('Enter a valid email first.'); return; }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
    setAuthMessage(error ? error.message : 'Magic link sent. Check your email to sign in.');
  }
  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setAuthUser(null);
    setPlan('free');
  }
  function updateAlertPreference(key: AlertPreferenceKey, value: boolean) {
    const next = { ...alertPreferences, [key]: value };
    setAlertPreferences(next);
    fetch('/api/alerts/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authUser?.id || null, preferences: next })
    }).catch(() => undefined);
  }

  async function upgradeToPro() {
    setUpgrading(true);
    setAuthMessage('');
    try {
      const checkoutEmail = authUser?.email || earlyEmail || authEmail;
      if (!checkoutEmail || !checkoutEmail.includes('@')) {
        setAuthMessage('Enter an email first so Pro access can sync after checkout.');
        setUpgrading(false);
        return;
      }
      if (!earlyEmail) setEarlyEmail(checkoutEmail);
      writeStored({ ...readStored(), earlyEmail: checkoutEmail, accessMode: 'early' });
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checkoutEmail, userId: authUser?.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Checkout failed with status ${response.status}`);
      if (data.url) window.location.href = data.url;
      else throw new Error('Stripe checkout did not return a URL. Check STRIPE_PRICE_ID and NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Stripe checkout is not configured yet.');
    } finally {
      setUpgrading(false);
    }
  }

  if (!mounted) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8" suppressHydrationWarning>
        <section className="card rounded-3xl p-6">
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Midnight Signal</p>
          <h1 className="mt-2 text-3xl font-black">Loading signal dashboard…</h1>
          <p className="mt-2 text-slate-300">Preparing your saved session and live market layer.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      {!agreed && <AgreementModal confirmedLearning={confirmedLearning} confirmedRisk={confirmedRisk} setConfirmedLearning={setConfirmedLearning} setConfirmedRisk={setConfirmedRisk} onAccept={acceptAgreement} />}
      {agreed && accessMode === 'unset' && <AccessModal earlyEmail={earlyEmail} setEarlyEmail={setEarlyEmail} onGuest={() => setAccessMode('guest')} onJoin={joinEarlyAccess} />}

      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1 text-xs font-semibold text-signal-blue"><Sparkles size={14} /> v{BUILD.version} · Embedded Learning Layer</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">What’s the signal tonight? <span className="text-signal-blue">🌙</span></h1>
          <p className="mt-2 max-w-2xl text-slate-300">One clear personal read, Midnight Network context, global discovery, and recommendations that explain why they were ranked for you.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"><strong className={plan === 'pro' ? 'text-signal-green' : 'text-white'}>{checkoutSyncing ? 'Finalizing Pro Access…' : plan === 'pro' ? 'Pro Unlocked' : authUser ? `Signed in · ${plan.toUpperCase()}` : accessMode === 'early' ? 'Early Access' : 'Guest Mode'}</strong><br />Build {BUILD.version}</div>
      </header>

      {checkoutSyncing && (
        <section className="mb-4 rounded-3xl border border-signal-blue/30 bg-signal-blue/10 p-4 text-sm text-slate-100">
          <strong className="text-signal-blue">Finalizing your Pro access…</strong> Stripe confirmed your checkout. Midnight Signal is waiting for the webhook to finish syncing your Supabase plan.
        </section>
      )}

      <section className="mb-4 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="card rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-signal-blue"><ShieldCheck size={18} /><p className="text-sm font-semibold uppercase tracking-[.2em]">Retention score</p></div>
          <div className="flex items-end justify-between gap-3"><p className="text-5xl font-black">{retentionScore}</p><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{riskPosture} posture</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-signal-blue" style={{ width: retentionScore + '%' }} /></div>
          <p className="mt-3 text-sm text-slate-300">Blends journey progress, receipt quality, plan depth, and recorded signal feedback.</p>
        </div>
        <div className="card rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-signal-blue"><CheckCircle2 size={18} /><p className="text-sm font-semibold uppercase tracking-[.2em]">Tonight's review plan</p></div>
          <div className="grid gap-2">{tonightPlan.map((item, index) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm text-slate-200"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-blue/15 text-xs font-black text-signal-blue">{index + 1}</span><span>{item}</span></div>)}</div>
        </div>
      </section>

      <SignalDiscoveryHero userTop={userTop} globalTop={globalTop} gap={topSignalGap} shouldExpose={shouldExposeGlobalTop} isPro={plan === 'pro'} currency={currency} userSummary={userTopSummary} globalSummary={globalTopSummary} globalInWatchlist={watchlist.includes(globalTop.symbol)} conversionCount={globalConversionCount} onSelect={selectSignal} onAddGlobal={addGlobalTopToWatchlist} onTrackGlobal={trackGlobalSignal} onUpgrade={() => { recordConversionEvent('global_upgrade_clicked', globalTop); upgradeToPro(); }} />

      <MidnightNetworkSpotlight insight={midnightNetwork} currency={currency} onSelect={selectSignal} onGlossary={openGlossaryTerm} />

      <PersonalIntelligenceCard profile={personalIntelligence} isPro={plan === 'pro'} message={recommendationMessage} onSelect={selectSignal} onAddToWatchlist={(symbol) => addSymbolToWatchlist(symbol, 'Personal intelligence recommendation')} onFeedback={recordRecommendationFeedback} onGlossary={openGlossaryTerm} />

      <RetentionIntelligenceCard digest={retentionDigest} events={retentionEvents.length} missedClicks={missedOpportunityCount} isPro={plan === 'pro'} onDigest={() => queueNotification('daily_digest', ['email'])} onWeekly={() => queueNotification('weekly_report', ['email'])} onMissedOpportunity={reviewMissedOpportunity} onUpgrade={() => { recordRetentionEvent('digest_upgrade_clicked', globalTop.symbol, { gap: topSignalGap }); upgradeToPro(); }} />

      <NotificationDeliveryCard preferences={notificationPreferences} status={notificationStatus} isSignedIn={Boolean(authUser?.id)} email={authEmail || earlyEmail || authUser?.email || ''} onToggle={updateNotificationPreference} onSendDaily={() => queueNotification('daily_digest', notificationPreferences.pushDailyDigest ? ['email', 'push'] : ['email'])} onSendWeekly={() => queueNotification('weekly_report', ['email'])} onEnablePush={enableBrowserPush} />

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
        <div className="card rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Performance proof</p><h2 className="text-2xl font-bold">At-a-glance receipts</h2></div><button onClick={() => setSound(!sound)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200 hover:bg-white/10" aria-label="Toggle sound">{sound ? <Volume2 /> : <VolumeX />}</button></div>
          <div className="grid gap-4 md:grid-cols-4">
            <BriefCard label="Win rate" value={`${performanceSummary.winRate}%`} detail={`${performanceSummary.wins} wins · ${performanceSummary.losses} losses from decisive outcomes`} />
            <BriefCard label="Avg return" value={`${performanceSummary.avgReturn >= 0 ? '+' : ''}${performanceSummary.avgReturn}%`} detail={`${performanceSummary.totalSignals} ${performanceSource === 'database' ? 'settled database' : 'simulated'} outcomes`} />
            <BriefCard label="Current streak" value={`${performanceSummary.currentStreak} ${outcomeLabel(performanceSummary.currentStreakType)}`} detail="Latest closed signal sequence" />
            <BriefCard label="Global best receipt" value={`${performanceSummary.best.symbol} ${performanceSummary.best.returnPct >= 0 ? '+' : ''}${performanceSummary.best.returnPct}%`} detail={performanceSummary.best.note} />
          </div>
        </div>

        <div className="card rounded-3xl p-5">
          <div className="mb-4 flex items-center gap-2"><Settings2 className="text-signal-blue" /><h2 className="text-xl font-bold">Session Settings</h2></div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Select label="Trader type" value={mode} onChange={v => setMode(v as TraderMode)} options={['scalp', 'swing', 'position']} />
            <Select label="Experience" value={experience} onChange={v => setExperience(v as Experience)} options={['beginner', 'pro']} />
            <Select label="Currency" value={currency} onChange={setCurrency} options={currencies} />
          </div>
        </div>
      </section>

      <ConversionLayer summary={performanceSummary} analytics={proAnalytics} isPro={plan === 'pro'} upgrading={upgrading || checkoutSyncing} onUpgrade={upgradeToPro} />

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <TrustCard icon={<DatabaseZap size={18} />} label="Data source" value={snapshot.source} detail={snapshot.source === 'CoinGecko live' ? 'Live prices loaded successfully' : 'Safe fallback is active'} />
        <TrustCard icon={<Clock3 size={18} />} label="Data last updated" value={new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} detail="Refreshes when mode or currency changes" onClick={() => { refreshMarket(); markRitual('market'); }} action={loadingLive ? 'Refreshing...' : 'Refresh'} />
        <TrustCard icon={<Zap size={18} />} label="Market condition" value={snapshot.marketCondition} detail={conditionCopy(snapshot.marketCondition)} onClick={() => markRitual('market')} />
      </section>

      <PerformanceHero summary={performanceSummary} results={performanceResults} analytics={proAnalytics} source={performanceSource} isPro={plan === 'pro'} onUpgrade={upgradeToPro} />


      <PersonalizedWatchlistHero signals={signals} personalizedSignals={personalizedSignals} watchlist={watchlist} preferences={watchlistPreferences} summary={watchlistSummary} input={watchlistInput} message={watchlistMessage} source={watchlistSource} limit={watchlistLimit} locked={watchlistLocked} isPro={plan === 'pro'} onInput={setWatchlistInput} onAdd={addWatchlistSymbol} onSelect={selectSignal} onToggle={toggleWatch} onPreference={updateSymbolPreference} onPrimary={setPrimaryWatchlistSymbol} onUpgrade={upgradeToPro} />

      <section className="mt-4 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="card rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Personal Watchlist</h2><span className="text-xs text-slate-400">{watchlist.length}/{watchlistLimit} symbols</span></div>
            <div className="space-y-3">{personalizedSignals.map(item => <SignalRow key={item.symbol} signal={item} active={item.symbol === active.symbol} currency={currency} onSelect={() => selectSignal(item.symbol)} onStar={() => toggleWatch(item.symbol)} starred />)}</div>
          </div>
          <AuthPanel authUser={authUser} plan={plan} authEmail={authEmail} setAuthEmail={setAuthEmail} authMessage={authMessage} onMagicLink={sendMagicLink} onSignOut={signOut} onUpgrade={upgradeToPro} upgrading={upgrading} checkoutSyncing={checkoutSyncing} />
          <JourneyCard visits={visits} journey={journey} completed={completedRitual} />
          <RitualCard ritual={ritual} mark={markRitual} />
          <NotificationsCard top={top} outcome={topOutcome} condition={snapshot.marketCondition} preferences={alertPreferences} events={alertEvents} dailyRecap={dailyRecap} isPro={plan === 'pro'} onToggle={updateAlertPreference} onUpgrade={upgradeToPro} />
        </div>

        <div className={`card rounded-3xl p-5 ${signalChanged ? 'animate-pulseSignal' : ''}`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-signal-blue">Your Top Signal</p><h2 className="text-4xl font-black">{top.symbol} <span className="text-lg font-medium text-slate-400">{top.name}</span></h2></div><span className={`rounded-full border px-4 py-2 text-sm font-bold ${labelClass(top.label)}`}>{top.label}</span></div>
          <p className="mb-4 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-4 text-slate-100">{top.why}</p>
          <Breakdown signal={top} onGlossary={openGlossaryTerm} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SignalPerformanceCard signal={top} outcome={topOutcome} />
            <PerformanceEngineCard engine={performanceEngine} isPro={plan === 'pro'} onUpgrade={upgradeToPro} />
            <FeedbackLoopCard signal={top} stats={topFeedbackStats} globalStats={globalFeedbackStats} message={feedbackMessage} onFeedback={(action, outcome) => recordSignalFeedback(top, action, outcome)} />
            <SignalHistoryPanel results={performanceResults} isPro={plan === 'pro'} onUpgrade={upgradeToPro} />
            <ProAnalyticsPanel analytics={proAnalytics} isPro={plan === 'pro'} onUpgrade={upgradeToPro} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ProLock isPro={plan === 'pro'} onUpgrade={upgradeToPro} title="Advanced MTF Weighting" body="Compare short, swing, and position posture in one combined Pro view. Used by early access members who want deeper context." />
            <ProLock isPro={plan === 'pro'} onUpgrade={upgradeToPro} title="Signal Confidence Notes" body="See how signals performed and why confidence shifted before reacting." />
          </div>
        </div>
      </section>

      <section className="mt-4 card rounded-3xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Top Signal Grid</h2><p className="text-sm text-slate-400">Tap a card to open its signal breakdown. Star it to add it to your watchlist.</p></div><button onClick={() => openGlossaryTerm('Signal')} className="rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 font-bold text-signal-blue"><BookOpen className="mr-2 inline" size={18} /> Glossary</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{signals.map(signal => <AssetCard key={signal.symbol} signal={signal} currency={currency} active={signal.symbol === active.symbol} starred={watchlist.includes(signal.symbol)} onSelect={() => selectSignal(signal.symbol)} onStar={() => toggleWatch(signal.symbol)} />)}</div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <div className="card rounded-3xl p-5"><h2 className="text-2xl font-black">Selected Signal: {active.symbol}</h2><p className="mt-1 text-slate-300">{active.why}</p><div className="mt-4"><Breakdown signal={active} compact onGlossary={openGlossaryTerm} /></div></div>
        <div className="card rounded-3xl p-5"><h2 className="text-2xl font-black">Pro Access</h2><p className="mt-2 text-slate-300">One clear upgrade path: full receipt history, advanced analytics, Pro alerts, and expanded watchlists.</p><button onClick={plan === 'pro' ? refreshPlan : upgradeToPro} className="mt-4 w-full rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 font-bold text-signal-blue">{checkoutSyncing ? 'Finalizing Pro access...' : plan === 'pro' ? 'Pro Active' : upgrading ? 'Opening Checkout...' : 'Upgrade to Pro'}</button></div>
      </section>

      {glossaryOpen && <Glossary activeTerm={activeGlossaryTerm} onJump={setActiveGlossaryTerm} onClose={() => setGlossaryOpen(false)} />}
      <footer className="py-8 text-center text-xs text-slate-500">Midnight Signal v{BUILD.version} · Embedded Learning Layer · {performanceSource === 'database' ? 'Persistent signal results' : 'Simulated performance fallback'} · {snapshot.source} · Educational use only · Not financial advice</footer>
    </main>
  );
}


function MidnightNetworkSpotlight({ insight, currency, onSelect, onGlossary }: { insight: ReturnType<typeof buildMidnightNetworkInsight>; currency: string; onSelect: (symbol: string) => void; onGlossary: (term: string) => void }) {
  return <section className="mb-4 rounded-[2rem] border border-signal-blue/20 bg-gradient-to-br from-signal-blue/10 via-white/[.03] to-signal-amber/10 p-5 shadow-soft">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-blue"><Moon size={14} /> Midnight Network Spotlight</div>
        <h2 className="text-2xl font-black">BTC · ADA · NIGHT basket intelligence</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">The default guest watchlist now highlights the Midnight Network stack: BTC as the macro liquidity anchor, ADA as the Cardano ecosystem anchor, and NIGHT as the Midnight ecosystem asset.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4 text-right">
        <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Network strength</p>
        <p className="text-4xl font-black text-white">{insight.score || '—'}</p>
        <p className="text-sm font-bold text-signal-blue">{insight.posture}</p>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {insight.basket.map(signal => {
        const role = midnightAssetRole(signal.symbol);
        return <button key={signal.symbol} onClick={() => onSelect(signal.symbol)} className="rounded-3xl border border-white/10 bg-black/15 p-4 text-left transition hover:border-signal-blue/40 hover:bg-white/[.06]">
          <div className="mb-2 flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">{role?.shortRole || 'Network leg'}</p><h3 className="mt-1 text-2xl font-black text-white">{signal.symbol}</h3></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${labelClass(signal.label)}`}>{signal.label}</span></div>
          <p className="text-sm text-slate-300">{role?.thesis}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-2xl border border-white/10 bg-white/[.04] p-3"><p className="text-xs text-slate-500">Confidence</p><p className="font-black text-white">{signal.confidence}%</p></div><div className="rounded-2xl border border-white/10 bg-white/[.04] p-3"><p className="text-xs text-slate-500">Price</p><p className="font-black text-white">{formatPrice(signal.price, currency)}</p></div></div>
        </button>;
      })}
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <BriefCard label="Basket read" value={insight.posture} detail={insight.summary} />
      <BriefCard label="Top contributor" value={insight.strongest?.symbol || '—'} detail={insight.topContributor} />
      <BriefCard label="Divergence alert" value={insight.weakest?.symbol || 'Aligned'} detail={insight.divergence + ' ' + insight.drag} />
    </div>
  </section>;
}

function PersonalIntelligenceCard({ profile, isPro, message, onSelect, onAddToWatchlist, onFeedback, onGlossary }: { profile: UserIntelligenceProfile; isPro: boolean; message: string; onSelect: (symbol: string) => void; onAddToWatchlist: (symbol: string) => void; onFeedback: (symbol: string, action: RecommendationFeedbackAction, metadata?: Record<string, unknown>) => void; onGlossary: (term: string) => void }) {
  const lead = profile.recommendations[0];
  return (
    <section className="rounded-[2rem] border border-signal-blue/20 bg-signal-blue/10 p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-blue"><Sparkles size={14} /> Embedded Learning Layer</div>
          <h2 className="text-2xl font-black">Recommended for you</h2>
          <p className="mt-1 text-sm text-slate-300">A pattern-aware feed that uses <GlossaryTerm term="Watchlist" onClick={onGlossary}>watchlist ownership</GlossaryTerm>, feedback outcomes, ignored signals, <GlossaryTerm term="Breakout" onClick={onGlossary}>global breakouts</GlossaryTerm>, and repeatable behavior to decide what you should review next.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-300">{profile.riskStyle} style</span>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <BriefCard label="Acted rate" value={profile.actedRate ? profile.actedRate + '%' : 'New'} detail="Actions vs ignores" />
        <BriefCard label="Win tendency" value={profile.winRate ? profile.winRate + '%' : 'Learning'} detail="Feedback + receipts" />
        <BriefCard label="Preferred assets" value={profile.preferredAssets[0] || 'None yet'} detail={profile.preferredAssets.slice(1, 3).join(' · ') || 'Built from behavior'} />
        <BriefCard label="Signal bias" value={profile.preferredSignalTypes[0] || 'Mixed'} detail={profile.learningBias} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <PatternBrief pattern={profile.strongestPattern} fallback="No winning pattern yet" />
        <PatternBrief pattern={profile.avoidPattern} fallback="No avoid pattern yet" />
        <PatternBrief pattern={profile.opportunityPattern} fallback="No opportunity pattern yet" />
      </div>
      {lead && <div className="mt-4 rounded-3xl border border-white/10 bg-black/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Next best personalized review</p>
            <h3 className="mt-1 text-2xl font-black text-white">{lead.symbol} · {lead.personalScore}% fit</h3>
            <p className="mt-1 text-sm text-slate-300">{lead.reason}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-300">{lead.source}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onSelect(lead.symbol)} className="rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 text-sm font-bold text-signal-blue"><Target className="mr-2 inline" size={15} /> Review signal</button>
          {lead.action === 'add_to_watchlist' && <button onClick={() => onAddToWatchlist(lead.symbol)} className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-4 py-3 text-sm font-bold text-signal-green"><PlusCircle className="mr-2 inline" size={15} /> Add to watchlist</button>}
          <button onClick={() => onFeedback(lead.symbol, 'more', { source: lead.source, score: lead.personalScore })} className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-4 py-3 text-sm font-bold text-signal-green"><ThumbsUp className="mr-2 inline" size={15} /> More like this</button>
          <button onClick={() => onFeedback(lead.symbol, 'less', { source: lead.source, score: lead.personalScore })} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><ThumbsDown className="mr-2 inline" size={15} /> Less like this</button>
          <button onClick={() => onFeedback(lead.symbol, 'hide', { source: lead.source, score: lead.personalScore })} className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold text-slate-300">Not interested</button>
          {!isPro && <span className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold text-slate-300"><Lock className="mr-2 inline" size={15} /> Pro unlocks deeper adaptive rules</span>}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <BriefCard label="Personal match" value={lead.scoreBreakdown.personalMatch + '%'} detail="Watchlist + preference feedback" />
          <BriefCard label="History" value={lead.scoreBreakdown.historicalPerformance + '%'} detail="Wins, losses, and receipts" />
          <BriefCard label="Global strength" value={lead.scoreBreakdown.globalStrength + '%'} detail="Current signal confidence" />
          <BriefCard label="Freshness" value={lead.scoreBreakdown.freshness + '%'} detail="Recent movement context" />
          <BriefCard label="Pattern match" value={lead.scoreBreakdown.patternMatch + '%'} detail="Strengths, avoids, and opportunities" />
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[.04] p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-white"><Info size={15} /> Why this?</p>
          <div className="grid gap-2 md:grid-cols-3">{lead.explanation.map(item => <div key={item} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-xs text-slate-400">{item}</div>)}</div>{lead.patternReasons.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{lead.patternReasons.map(item => <div key={item} className="rounded-2xl border border-signal-green/20 bg-signal-green/10 p-3 text-xs font-bold text-signal-green">{item}</div>)}</div>}
        </div>
      </div>}
      {message && <p className="mt-3 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-3 text-sm font-bold text-signal-blue">{message}</p>}
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {profile.explainers.map(item => <div key={item} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-xs text-slate-400">{item}</div>)}
      </div>
    </section>
  );
}

function SignalDiscoveryHero({ userTop, globalTop, gap, shouldExpose, isPro, currency, userSummary, globalSummary, globalInWatchlist, conversionCount, onSelect, onAddGlobal, onTrackGlobal, onUpgrade }: { userTop: AssetSignal; globalTop: AssetSignal; gap: number; shouldExpose: boolean; isPro: boolean; currency: string; userSummary: ReturnType<typeof summarizePerformance>; globalSummary: ReturnType<typeof summarizePerformance>; globalInWatchlist: boolean; conversionCount: number; onSelect: (symbol: string) => void; onAddGlobal: () => void; onTrackGlobal: () => void; onUpgrade: () => void }) {
  const sameSignal = userTop.symbol === globalTop.symbol;
  const locked = !isPro && shouldExpose && gap >= 4;
  const comparison = sameSignal ? 'Your watchlist already contains the global leader.' : gap > 0 ? '+' + gap + '% confidence vs your top signal' : 'Different opportunity profile';
  const globalReason = globalSummary.totalSignals > 0 ? globalTop.symbol + ' has ' + globalSummary.winRate + '% tracked win rate across ' + globalSummary.totalSignals + ' receipts.' : globalTop.symbol + ' leads by current signal strength while history builds.';
  return <section className="mb-4 grid gap-4 lg:grid-cols-2">
    <div className="rounded-[2rem] border border-signal-blue/25 bg-signal-blue/10 p-5 sm:p-6">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-blue"><Target size={14} /> Your Top Signal</div>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-5xl font-black sm:text-6xl">{userTop.symbol}</h2><p className="mt-1 text-slate-400">{userTop.name}</p></div><span className={'rounded-full border px-4 py-2 text-sm font-bold ' + labelClass(userTop.label)}>{userTop.label}</span></div>
      <p className="mt-4 rounded-3xl border border-signal-blue/20 bg-signal-blue/10 p-4 text-sm text-slate-100">{userTop.why}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><BriefCard label="Confidence" value={userTop.confidence + '%'} detail="Watchlist scope" /><BriefCard label="Personal win rate" value={userSummary.winRate + '%'} detail={userSummary.totalSignals + ' tracked receipts'} /><BriefCard label="24h move" value={(userTop.change24h >= 0 ? '+' : '') + userTop.change24h + '%'} detail={formatPrice(userTop.price, currency)} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><BriefCard label="Role" value="Control" detail="Deep analysis stays anchored to assets the user chose." /><BriefCard label="Next action" value="Review" detail="Use feedback controls below after acting or ignoring." /></div>
    </div>
    <div className={(locked ? 'premium-lock ' : '') + "rounded-[2rem] border border-signal-amber/30 bg-gradient-to-br from-signal-amber/15 via-white/[.04] to-signal-blue/10 p-5 sm:p-6"}>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-amber/30 bg-signal-amber/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-amber"><Flame size={14} /> Global Top Signal</div>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-5xl font-black sm:text-6xl">{globalTop.symbol}</h2><p className="mt-1 text-slate-400">{globalTop.name} · outside your watchlist universe unless added</p></div><span className={'rounded-full border px-4 py-2 text-sm font-bold ' + labelClass(globalTop.label)}>{globalTop.label}</span></div>
      <p className="mt-4 rounded-3xl border border-signal-amber/20 bg-signal-amber/10 p-4 text-sm text-slate-100">{globalReason}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><BriefCard label="Confidence" value={globalTop.confidence + '%'} detail={comparison} /><BriefCard label="Global win rate" value={globalSummary.winRate + '%'} detail={globalSummary.totalSignals + ' receipts analyzed'} /><BriefCard label="Exposure" value={shouldExpose ? 'Shown' : 'Quiet'} detail={shouldExpose ? 'Material opportunity' : 'No major gap'} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><BriefCard label="Why it matters" value={sameSignal ? 'Aligned' : 'Discovery'} detail={sameSignal ? 'Personal and global signals agree.' : 'Shows better opportunities beyond current assets.'} /><BriefCard label="Conversion events" value={String(conversionCount)} detail="Views, tracking, adds, or upgrade intent" /></div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={onTrackGlobal} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber">Track this signal</button><button onClick={onAddGlobal} disabled={globalInWatchlist} className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-4 py-3 text-sm font-bold text-signal-green disabled:opacity-50"><PlusCircle className="mr-2 inline" size={15} /> {globalInWatchlist ? 'Already in watchlist' : 'Add to watchlist'}</button>{!isPro && <button onClick={onUpgrade} className="rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm font-bold text-white"><Lock className="mr-2 inline" size={15} /> Unlock global analytics</button>}</div>
      {!isPro && <p className="mt-3 text-xs text-slate-500">Free shows headline global intelligence. Pro unlocks deeper history, breakdowns, and advanced comparison.</p>}
    </div>
  </section>;
}

function AgreementModal({ confirmedLearning, confirmedRisk, setConfirmedLearning, setConfirmedRisk, onAccept }: { confirmedLearning: boolean; confirmedRisk: boolean; setConfirmedLearning: (v: boolean) => void; setConfirmedRisk: (v: boolean) => void; onAccept: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"><section className="card max-w-xl rounded-3xl p-6"><div className="mb-4 flex items-center gap-3"><span className="rounded-2xl bg-midnight-500/20 p-3 text-signal-blue"><Moon /></span><div><h1 className="text-2xl font-bold">Agreement of Understanding</h1><p className="text-sm text-slate-300">Midnight Signal is educational market guidance, not financial advice.</p></div></div><div className="space-y-3 text-sm text-slate-300"><label className="flex gap-3 rounded-2xl border border-white/10 p-3"><input type="checkbox" checked={confirmedLearning} onChange={e => setConfirmedLearning(e.target.checked)} /> I understand this app is for learning and signal context.</label><label className="flex gap-3 rounded-2xl border border-white/10 p-3"><input type="checkbox" checked={confirmedRisk} onChange={e => setConfirmedRisk(e.target.checked)} /> I understand crypto markets are risky and I make my own decisions.</label></div><button onClick={onAccept} disabled={!confirmedLearning || !confirmedRisk} className="mt-5 w-full rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40">Agree and Enter</button></section></div>;
}
function AccessModal({ earlyEmail, setEarlyEmail, onGuest, onJoin }: { earlyEmail: string; setEarlyEmail: (v: string) => void; onGuest: () => void; onJoin: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"><section className="card max-w-2xl rounded-3xl p-6"><div className="mb-4 flex items-center gap-3"><span className="rounded-2xl bg-signal-blue/10 p-3 text-signal-blue"><Mail /></span><div><h1 className="text-2xl font-black">Join Early Access</h1><p className="text-sm text-slate-300">Save your place for real accounts, Pro insights, and founder pricing.</p></div></div><input value={earlyEmail} onChange={e => setEarlyEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-signal-blue/20" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={onJoin} disabled={!earlyEmail.includes('@')} className="rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:opacity-40">Join Early Access</button><button onClick={onGuest} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white">Continue as Guest</button></div></section></div>;
}
function BriefCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p></div>; }
function PatternBrief({ pattern, fallback }: { pattern?: UserIntelligenceProfile['patterns'][number]; fallback: string }) {
  const tone = pattern?.direction === 'strength' ? 'text-signal-green border-signal-green/20 bg-signal-green/10' : pattern?.direction === 'weakness' ? 'text-signal-amber border-signal-amber/20 bg-signal-amber/10' : 'text-signal-blue border-signal-blue/20 bg-signal-blue/10';
  return <div className={'rounded-3xl border p-4 ' + tone}><p className="text-xs font-black uppercase tracking-[.16em]">{pattern?.direction || 'learning'}</p><p className="mt-2 text-lg font-black text-white">{pattern?.title || fallback}</p><p className="mt-1 text-sm text-slate-300">{pattern?.description || 'Keep using feedback controls and signal outcomes to train this insight.'}</p>{pattern && <p className="mt-2 text-xs font-bold">{pattern.confidence}% confidence · {pattern.action}</p>}</div>;
}


function RetentionIntelligenceCard({ digest, events, missedClicks, isPro, onDigest, onWeekly, onMissedOpportunity, onUpgrade }: { digest: RetentionDigest; events: number; missedClicks: number; isPro: boolean; onDigest: () => void; onWeekly: () => void; onMissedOpportunity: () => void; onUpgrade: () => void }) {
  return <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
    <div className="card rounded-3xl border border-signal-blue/20 bg-signal-blue/5 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-blue"><BellRing size={14} /> Automated Retention Engine</div><h2 className="text-2xl font-black">Daily signal digest</h2><p className="mt-1 text-sm text-slate-300">A habit loop that turns personal signals, global discovery, and receipts into one daily reason to return.</p></div><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-300">{events} retention events</span></div>
      <div className="grid gap-3 md:grid-cols-3"><BriefCard label="Your daily signal" value={digest.personalSignal.symbol} detail={digest.personalSignal.name} /><BriefCard label="Global opportunity" value={digest.globalSignal.symbol} detail={digest.missedOpportunity ? `+${digest.gap} confidence gap` : 'Aligned with your system'} /><BriefCard label="Weekly proof" value={digest.winRate ? digest.winRate + '%' : 'New'} detail={digest.weeklyNote} /></div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4"><p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Next best retention hook</p><p className="mt-1 text-lg font-bold text-white">{digest.action}</p></div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={onDigest} className="rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 text-sm font-bold text-signal-blue"><Mail className="mr-2 inline" size={15} /> Preview daily digest</button><button onClick={onWeekly} className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-4 py-3 text-sm font-bold text-signal-green"><BarChart3 className="mr-2 inline" size={15} /> Preview weekly report</button>{digest.missedOpportunity && <button onClick={onMissedOpportunity} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><Flame className="mr-2 inline" size={15} /> Review missed opportunity</button>}</div>
    </div>
    <div className="card rounded-3xl p-5">
      <div className="mb-3 flex items-center gap-2 text-signal-amber"><Trophy size={18} /><h2 className="text-xl font-black">Weekly performance report</h2></div>
      <p className="text-sm text-slate-300">Summarizes wins, ignored signals, watchlist gaps, and global opportunities so users do not have to reconstruct their progress manually.</p>
      <div className="mt-4 grid gap-2"><BriefCard label="Missed opportunity clicks" value={String(missedClicks)} detail="Users reacting to global gaps" /><BriefCard label="Digest status" value={isPro ? 'Unlocked' : 'Preview'} detail={isPro ? 'Ready for automated email/push wiring' : 'Upgrade CTA can gate full report history'} /></div>
      {!isPro && <button onClick={onUpgrade} className="mt-4 w-full rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><Lock className="mr-2 inline" size={15} /> Unlock automated reports</button>}
    </div>
  </section>;
}


function NotificationDeliveryCard({ preferences, status, isSignedIn, email, onToggle, onSendDaily, onSendWeekly, onEnablePush }: { preferences: NotificationPreferences; status: NotificationStatus; isSignedIn: boolean; email: string; onToggle: <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => void; onSendDaily: () => void; onSendWeekly: () => void; onEnablePush: () => void }) {
  return <section className="mt-4 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
    <div className="card rounded-3xl border border-signal-green/20 bg-signal-green/5 p-5">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-signal-green/30 bg-signal-green/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-green"><BellRing size={14} /> Notification Automation</div>
      <h2 className="text-2xl font-black">Deliver the habit loop</h2>
      <p className="mt-1 text-sm text-slate-300">Cron-ready digests and reports now enforce preferences, quiet hours, duplicate-send protection, and delivery logging before anything leaves the system.</p>
      <div className="mt-4 grid gap-2"><BriefCard label="Email destination" value={email || 'Not set'} detail={isSignedIn ? 'Linked to signed-in account' : 'Use early access email or sign in'} /><BriefCard label="Push status" value={status.push} detail={status.message} /></div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={onSendDaily} className="rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 text-sm font-bold text-signal-blue"><Mail className="mr-2 inline" size={15} /> Send daily preview</button><button onClick={onSendWeekly} className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-4 py-3 text-sm font-bold text-signal-green"><BarChart3 className="mr-2 inline" size={15} /> Send weekly preview</button><button onClick={onEnablePush} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><BellRing className="mr-2 inline" size={15} /> Enable browser push</button></div>
    </div>
    <div className="card rounded-3xl p-5">
      <div className="mb-3 flex items-center gap-2 text-signal-blue"><Settings2 size={18} /><h2 className="text-xl font-black">Notification preferences + guardrails</h2></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow label="Email daily digest" checked={preferences.emailDailyDigest} onChange={v => onToggle('emailDailyDigest', v)} />
        <ToggleRow label="Email weekly report" checked={preferences.emailWeeklyReport} onChange={v => onToggle('emailWeeklyReport', v)} />
        <ToggleRow label="Push daily digest" checked={preferences.pushDailyDigest} onChange={v => onToggle('pushDailyDigest', v)} />
        <ToggleRow label="Push weekly report" checked={preferences.pushWeeklyReport} onChange={v => onToggle('pushWeeklyReport', v)} />
        <ToggleRow label="Push missed opportunities" checked={preferences.pushMissedOpportunity} onChange={v => onToggle('pushMissedOpportunity', v)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><BriefCard label="Quiet hours" value={preferences.quietHoursStart + ' - ' + preferences.quietHoursEnd} detail="Enforced by the scheduler before automated sends" /><BriefCard label="Delivery status" value={status.email === 'idle' ? 'Ready' : status.email} detail="Logs sent, failed, skipped and duplicate deliveries" /></div>
      <p className="mt-3 text-xs text-slate-500">Production email requires RESEND_API_KEY and RESEND_FROM_EMAIL. Set CRON_SECRET for Vercel cron protection. Duplicate sends are blocked with notification_delivery_logs.</p>
    </div>
  </section>;
}
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold text-slate-200"><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /></label>;
}

function ConversionLayer({ summary, analytics, isPro, upgrading, onUpgrade }: { summary: ReturnType<typeof summarizePerformance>; analytics: ReturnType<typeof buildProPerformanceAnalytics>; isPro: boolean; upgrading: boolean; onUpgrade: () => void }) {
  const window7d = analytics.windows[0]?.summary || summary;
  const decisiveText = `${summary.wins} wins / ${summary.losses} losses`;
  const streakText = summary.currentStreak > 0 ? `${summary.currentStreak} ${outcomeLabel(summary.currentStreakType).toLowerCase()} streak` : 'No streak yet';
  const cta = `Unlock full performance - ${summary.winRate}% win rate over ${Math.max(summary.totalSignals, 1)} tracked signals`;

  if (isPro) {
    return <section className="mt-4 rounded-3xl border border-signal-green/25 bg-signal-green/10 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-green/30 bg-signal-green/10 px-3 py-1 text-xs font-bold text-signal-green"><CheckCircle2 size={14} /> Pro conversion layer unlocked</div><h2 className="text-2xl font-black">Full performance is live on this account.</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">You can see complete receipts, confidence accuracy, symbol breakdowns, and 7/30/90 day windows.</p></div><div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]"><BriefCard label="Tracked edge" value={`${summary.winRate}%`} detail={decisiveText} /><BriefCard label="Avg return" value={`${summary.avgReturn >= 0 ? '+' : ''}${summary.avgReturn}%`} detail="Across tracked receipts" /><BriefCard label="Best receipt" value={`${summary.best.symbol} ${summary.best.returnPct >= 0 ? '+' : ''}${summary.best.returnPct}%`} detail="Visible in full history" /></div></div></section>;
  }

  return <section className="mt-4 overflow-hidden rounded-3xl border border-signal-amber/30 bg-gradient-to-br from-signal-amber/15 via-white/[.04] to-signal-blue/10 p-5"><div className="grid gap-5 lg:grid-cols-[1fr_.85fr] lg:items-center"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-amber/30 bg-signal-amber/10 px-3 py-1 text-xs font-bold text-signal-amber"><Lock size={14} /> Pro preview</div><h2 className="text-3xl font-black">{cta}</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Free keeps the top signal and limited receipts. Pro unlocks the full conversion layer: deeper analytics, complete history, expanded watchlists, and instant alert intelligence.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-200">7D: {window7d.winRate}% win rate</span><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-200">{streakText}</span><span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-bold text-slate-200">Confidence accuracy: {summary.confidenceAccuracy}%</span></div><button onClick={onUpgrade} disabled={upgrading} className="mt-5 rounded-2xl bg-signal-amber px-5 py-3 font-black text-midnight-950 shadow-soft disabled:cursor-wait disabled:opacity-60">{upgrading ? 'Opening Pro...' : 'Unlock full performance'}</button><p className="mt-3 text-xs text-slate-500">Educational use only. Simulated or tracked performance does not guarantee future results.</p></div><div className="relative rounded-3xl border border-white/10 bg-black/20 p-4"><div className="premium-lock blur-[2px] opacity-70"><div className="grid gap-3"><BriefCard label="30D win rate" value={`${analytics.windows[1]?.summary.winRate ?? summary.winRate}%`} detail="Pro-only time window" /><BriefCard label="By confidence" value={`${analytics.byConfidenceTier[0]?.winRate ?? summary.confidenceAccuracy}%`} detail={analytics.byConfidenceTier[0]?.label || 'High-confidence tier'} /><BriefCard label="By symbol" value={analytics.bySymbol[0]?.label || summary.best.symbol} detail={`${analytics.bySymbol[0]?.winRate ?? summary.winRate}% symbol win rate`} /></div></div><div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-midnight-950/45 p-4 text-center backdrop-blur-[1px]"><div><Lock className="mx-auto mb-2 text-signal-amber" /><p className="font-black text-white">Advanced analytics locked</p><p className="mt-1 text-xs text-slate-300">Show the value. Lock the depth.</p></div></div></div></div></section>;
}
function PersonalizedWatchlistHero({ signals, personalizedSignals, watchlist, preferences, summary, input, message, source, limit, locked, isPro, onInput, onAdd, onSelect, onToggle, onPreference, onPrimary, onUpgrade }: { signals: AssetSignal[]; personalizedSignals: AssetSignal[]; watchlist: string[]; preferences: WatchlistPreference[]; summary: ReturnType<typeof summarizePerformance>; input: string; message: string; source: 'local' | 'database'; limit: number; locked: boolean; isPro: boolean; onInput: (value: string) => void; onAdd: () => void; onSelect: (symbol: string) => void; onToggle: (symbol: string) => void; onPreference: (symbol: string, key: 'highConfidenceAlerts' | 'settlementAlerts', value: boolean) => void; onPrimary: (symbol: string) => void; onUpgrade: () => void }) {
  const suggestions = signals.filter(signal => !watchlist.includes(signal.symbol)).slice(0, 6);
  const primary = personalizedSignals[0];
  return <section className="mt-4 rounded-3xl border border-signal-blue/20 bg-signal-blue/5 p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1 text-xs font-bold text-signal-blue"><Target size={14} /> Personalized Watchlists</div><h2 className="text-3xl font-black">Your top signal is now picked from your watchlist.</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">Guests start with the Midnight Network default watchlist: BTC, ADA, and NIGHT. Pro unlocks expanded watchlists, per-symbol alerts, and deeper personalized analytics.</p><p className="mt-2 text-xs text-slate-500">Watchlist source: {source === 'database' ? 'Supabase profile sync' : 'local session fallback'} · Midnight resolves to NIGHT · Educational use only · Not financial advice.</p></div>
      {!isPro && <button onClick={onUpgrade} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><Lock className="mr-2 inline" size={16} /> Unlimited watchlist</button>}
    </div>
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-slate-400">Top signal for you</p><h3 className="mt-1 text-2xl font-black">{primary?.symbol || 'N/A'}</h3></div><span className="rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black text-signal-blue">{watchlist.length}/{limit}</span></div>
        {primary && <><p className="text-sm text-slate-300">{primary.why}</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><BriefCard label="Personal win rate" value={summary.winRate + '%'} detail={summary.totalSignals + ' watchlist outcomes'} /><BriefCard label="Avg return" value={(summary.avgReturn >= 0 ? '+' : '') + summary.avgReturn + '%'} detail="Watchlist-weighted receipts" /><BriefCard label="Best watch" value={summary.best.symbol + ' ' + (summary.best.returnPct >= 0 ? '+' : '') + summary.best.returnPct + '%'} detail="Best closed receipt" /></div></>}
        <div className="mt-4 flex gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 text-slate-500" size={17} /><input value={input} onChange={event => onInput(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === 'Enter') onAdd(); }} placeholder="Add symbol, e.g. NIGHT or Midnight" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none focus:ring-4 focus:ring-signal-blue/20" /></div><button onClick={onAdd} disabled={locked && !watchlist.includes(normalizeAssetSymbol(input))} className="rounded-2xl border border-signal-blue/30 bg-signal-blue/10 px-4 py-3 text-sm font-bold text-signal-blue disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>
        {message && <p className="mt-3 rounded-2xl border border-signal-amber/30 bg-signal-amber/10 p-3 text-sm text-signal-amber">{message}</p>}
        <div className="mt-3 flex flex-wrap gap-2">{suggestions.map(signal => <button key={signal.symbol} onClick={() => onToggle(signal.symbol)} disabled={locked} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-bold text-slate-300 disabled:opacity-40">+ {signal.symbol}</button>)}</div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-black">Symbols you care about</h3>{!isPro && <span className="text-xs text-signal-amber">Free cap: 3</span>}</div>
        <div className="space-y-2">{personalizedSignals.map(signal => {
          const pref = preferences.find(item => item.symbol === signal.symbol) || { symbol: signal.symbol, highConfidenceAlerts: true, settlementAlerts: true, isPrimary: false };
          return <div key={signal.symbol} className="rounded-2xl border border-white/10 bg-black/10 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><button onClick={() => onSelect(signal.symbol)} className="text-left"><span className="font-black">{signal.symbol}</span><span className="ml-2 text-sm text-slate-400">{signal.name}</span></button><div className="flex gap-2"><button onClick={() => onPrimary(signal.symbol)} className={pref.isPrimary ? 'rounded-full bg-signal-green/20 px-3 py-1 text-xs font-black text-signal-green' : 'rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-400'}>{pref.isPrimary ? 'PRIMARY' : 'Make primary'}</button><button onClick={() => onToggle(signal.symbol)} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-400">Remove</button></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={() => onPreference(signal.symbol, 'highConfidenceAlerts', !pref.highConfidenceAlerts)} className={pref.highConfidenceAlerts ? 'rounded-xl border border-signal-green/30 bg-signal-green/10 px-3 py-2 text-xs font-bold text-signal-green' : 'rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-slate-400'}>High-confidence alerts {pref.highConfidenceAlerts ? 'ON' : 'OFF'}</button><button onClick={() => onPreference(signal.symbol, 'settlementAlerts', !pref.settlementAlerts)} className={pref.settlementAlerts ? 'rounded-xl border border-signal-green/30 bg-signal-green/10 px-3 py-2 text-xs font-bold text-signal-green' : 'rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-slate-400'}>Settlement alerts {pref.settlementAlerts ? 'ON' : 'OFF'}</button></div></div>;
        })}</div>
      </div>
    </div>
  </section>;
}
function TrustCard({ icon, label, value, detail, onClick, action }: { icon: React.ReactNode; label: string; value: string; detail: string; onClick?: () => void; action?: string }) { return <div className="card rounded-3xl p-4"><div className="mb-2 flex items-center gap-2 text-signal-blue">{icon}<span className="text-xs font-bold uppercase tracking-[.16em]">{label}</span></div><p className="text-xl font-black capitalize">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p>{onClick && <button onClick={onClick} className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">{action || 'Mark reviewed'}</button>}</div>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) { return <label className="block"><span className="mb-1 block text-xs uppercase tracking-[.16em] text-slate-400">{label}</span><div className="relative"><select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 capitalize text-white outline-none ring-signal-blue/0 transition focus:ring-4">{options.map(option => <option key={option} value={option} className="bg-midnight-900">{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" /></div></label>; }
function SignalRow({ signal, currency, active, starred, onSelect, onStar }: { signal: AssetSignal; currency: string; active: boolean; starred: boolean; onSelect: () => void; onStar: () => void }) { return <div className={`flex items-center justify-between rounded-2xl border p-3 ${active ? 'border-signal-blue/50 bg-signal-blue/10' : 'border-white/10 bg-white/[.04]'}`}><button onClick={onSelect} className="text-left"><p className="font-bold">{signal.symbol} <span className="text-sm font-normal text-slate-400">{signal.name}</span></p><p className="text-sm text-slate-300">{formatPrice(signal.price, currency)} · {signal.confidence}%</p></button><button onClick={onStar} className="rounded-xl p-2 text-signal-amber hover:bg-white/10"><Star fill={starred ? 'currentColor' : 'none'} /></button></div>; }
function AssetCard({ signal, currency, active, starred, onSelect, onStar }: { signal: AssetSignal; currency: string; active: boolean; starred: boolean; onSelect: () => void; onStar: () => void }) { return <div className={`group rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/[.07] ${active ? 'border-signal-blue/50 bg-signal-blue/10' : 'border-white/10 bg-white/[.04]'}`}><div className="flex items-start justify-between"><button onClick={onSelect} className="text-left"><p className="text-lg font-black">{signal.symbol}</p><p className="text-sm text-slate-400">{signal.name}</p></button><button onClick={onStar} className="rounded-xl p-2 text-signal-amber transition group-hover:scale-110"><Star fill={starred ? 'currentColor' : 'none'} /></button></div><div className="mt-4 flex items-end justify-between"><div><p className="font-bold">{formatPrice(signal.price, currency)}</p><p className={signal.change24h >= 0 ? 'text-sm text-signal-green' : 'text-sm text-signal-red'}>{signal.change24h >= 0 ? '+' : ''}{signal.change24h}%</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${labelClass(signal.label)}`}>{signal.confidence}%</span></div></div>; }
function GlossaryTerm({ term, children, onClick }: { term: string; children: React.ReactNode; onClick: (term: string) => void }) {
  return <button type="button" onClick={() => onClick(term)} className="font-bold text-signal-blue underline decoration-signal-blue/40 underline-offset-4 transition hover:text-white">{children}</button>;
}

function Breakdown({ signal, compact = false, onGlossary }: { signal: AssetSignal; compact?: boolean; onGlossary: (term: string) => void }) {
  const rows = [['Momentum', signal.momentum], ['Trend', signal.trend], ['Volatility', signal.volatility], ['MTF Weight', signal.mtf]] as const;
  return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
    <div className="mb-3 flex items-center gap-2"><Zap className="text-signal-blue" size={18} /><h3 className="font-bold">Signal Breakdown</h3></div>
    <div className="space-y-3">{rows.map(([label, value]) => <div key={label}>
      <div className="mb-1 flex justify-between text-sm"><span className="text-slate-300"><GlossaryTerm term={label === 'MTF Weight' ? 'MTF' : label} onClick={onGlossary}>{label}</GlossaryTerm></span><span className="font-bold">{value}%</span></div>
      <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-signal-blue" style={{ width: `${value}%` }} /></div>
    </div>)}</div>
    {!compact && <p className="mt-4 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-3 text-sm text-slate-200"><Info className="mr-2 inline text-signal-blue" size={16} />Heuristic education signal: <GlossaryTerm term="Trend" onClick={onGlossary}>trend</GlossaryTerm> + <GlossaryTerm term="Momentum" onClick={onGlossary}>momentum</GlossaryTerm> + <GlossaryTerm term="Volatility" onClick={onGlossary}>volatility</GlossaryTerm> + <GlossaryTerm term="MTF" onClick={onGlossary}>multi-timeframe posture</GlossaryTerm>.</p>}
  </div>;
}

function PerformanceHero({ summary, results, analytics, source, isPro, onUpgrade }: { summary: ReturnType<typeof summarizePerformance>; results: SignalResult[]; analytics: ReturnType<typeof buildProPerformanceAnalytics>; source: 'database' | 'simulated'; isPro: boolean; onUpgrade: () => void }) {
  const recent = results.slice(0, isPro ? 9 : 3);
  return <section className="mt-4 card rounded-3xl p-5">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-green/20 bg-signal-green/10 px-3 py-1 text-xs font-bold text-signal-green"><BarChart3 size={14} /> Signal Receipts + Pro Analytics</div><h2 className="text-3xl font-black">Every signal now leaves a receipt.</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">Closed signals show entry, exit, return, hold time, and outcome. Pro turns those receipts into symbol, confidence, and time-window analytics.</p><p className="mt-2 text-xs text-slate-500">{source === 'database' ? 'Using settled database receipts.' : 'Using deterministic simulated receipts until your cron settles live rows.'} Simulated historical results are not financial advice and do not guarantee future returns.</p></div>{!isPro && <button onClick={onUpgrade} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><Lock className="mr-2 inline" size={16} /> Unlock Pro analytics</button>}</div>
    <div className="grid gap-3 md:grid-cols-4">
      <MetricTile icon={<Target size={18} />} label="Win rate" value={`${summary.winRate}%`} detail={`${summary.wins}/${summary.wins + summary.losses} decisive receipts`} />
      <MetricTile icon={<TrendingUp size={18} />} label="Avg return" value={`${summary.avgReturn >= 0 ? '+' : ''}${summary.avgReturn}%`} detail={`${summary.totalReturn >= 0 ? '+' : ''}${summary.totalReturn}% total tracked`} />
      <MetricTile icon={<Flame size={18} />} label="Streak" value={`${summary.currentStreak} ${outcomeLabel(summary.currentStreakType)}`} detail="Most recent closed run" />
      <MetricTile icon={<Clock3 size={18} />} label="Avg hold" value={`${analytics.averageHoldHours}h`} detail="Average receipt settlement time" />
    </div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Receipt extremes</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><ResultMini result={analytics.bestReceipt} title="Best receipt" /><ResultMini result={analytics.worstReceipt} title="Needs review" /></div></div>
      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Latest signal receipts</p><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{recent.map(result => <SignalReceiptCard key={result.id} result={result} compact={!isPro} />)}</div>{!isPro && <p className="mt-3 text-xs text-slate-400">Free preview shows the receipt headline. Pro unlocks full receipt notes and analytics breakdowns.</p>}</div>
    </div>
  </section>;
}

function MetricTile({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="mb-2 flex items-center gap-2 text-signal-blue">{icon}<span className="text-xs font-bold uppercase tracking-[.16em]">{label}</span></div><p className="text-3xl font-black">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}

function ResultMini({ result, title }: { result: SignalResult; title?: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center justify-between gap-2"><p className="font-black">{title ? title + ': ' : ''}{result.symbol}</p><span className={'rounded-full border px-2 py-1 text-[11px] font-black ' + performanceOutcomeClass(result.outcome)}>{outcomeLabel(result.outcome)}</span></div><p className={result.returnPct >= 0 ? 'mt-2 text-lg font-black text-signal-green' : 'mt-2 text-lg font-black text-signal-red'}>{result.returnPct >= 0 ? '+' : ''}{result.returnPct}%</p><p className="text-xs text-slate-400">{result.direction.toUpperCase()} · {result.confidence}% confidence · {formatHoldTime(result.openedAt, result.closedAt)}</p></div>;
}

function SignalReceiptCard({ result, compact = false }: { result: SignalResult; compact?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-black">{result.symbol} <span className="text-xs font-normal text-slate-400">{result.direction.toUpperCase()}</span></p><p className="text-xs text-slate-400">{new Date(result.closedAt).toLocaleDateString()} · {formatHoldTime(result.openedAt, result.closedAt)}</p></div><span className={'rounded-full border px-2 py-1 text-[11px] font-black ' + performanceOutcomeClass(result.outcome)}>{outcomeLabel(result.outcome)}</span></div><div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs text-slate-400">Entry → Exit</p><p className="font-bold">{result.entryPrice} → {result.exitPrice}</p><p className={result.returnPct >= 0 ? 'text-sm font-black text-signal-green' : 'text-sm font-black text-signal-red'}>{result.returnPct >= 0 ? '+' : ''}{result.returnPct}%</p></div>{!compact && <><p className="mt-2 text-xs text-slate-300">{buildSignalReceiptText(result)}</p><p className="mt-1 text-xs text-slate-500">{result.note}</p></>}</div>;
}

function SignalPerformanceCard({ signal, outcome }: { signal: AssetSignal; outcome: SignalOutcome }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 flex items-center gap-2 text-signal-blue"><Activity size={18} /><h3 className="font-bold">Previous Signal Result</h3></div><span className={'inline-flex rounded-full border px-3 py-1 text-xs font-black ' + outcomeClass(outcome)}>{outcome}</span><p className="mt-3 text-sm text-slate-300">{signal.symbol} is reviewed through a simple 24h outcome lens: Worked / Failed / Neutral. This keeps the product honest without pretending to be a guaranteed trading system.</p><p className="mt-3 text-xs text-slate-500">Educational heuristic only · not financial advice</p></div>;
}
function SignalHistoryPanel({ results, isPro, onUpgrade }: { results: SignalResult[]; isPro: boolean; onUpgrade: () => void }) {
  const visible = results.slice(0, isPro ? 10 : 3);
  return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-signal-blue"><History size={18} /><h3 className="font-bold">Signal Receipt Ledger</h3></div>{!isPro && <Lock className="text-signal-amber" size={18} />}</div><div className={!isPro ? 'premium-lock space-y-2 opacity-75' : 'space-y-2'}>{visible.map(item => <SignalReceiptCard key={item.id} result={item} compact={!isPro} />)}</div>{!isPro && <div><p className="mt-3 text-sm text-slate-300">Free preview shows three receipts. Pro unlocks the full receipt ledger, notes, and analytics depth.</p><button onClick={onUpgrade} className="mt-3 w-full rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber">Unlock receipt ledger</button></div>}</div>;
}

function AnalyticsBreakdownTable({ title, rows }: { title: string; rows: ReturnType<typeof buildProPerformanceAnalytics>['bySymbol'] }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-slate-400">{title}</p><div className="space-y-2">{rows.map(row => <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs"><span className="font-bold text-slate-200">{row.label}</span><span className="text-slate-400">{row.total}x</span><span className={row.avgReturn >= 0 ? 'font-black text-signal-green' : 'font-black text-signal-red'}>{row.winRate}% · {row.avgReturn >= 0 ? '+' : ''}{row.avgReturn}%</span></div>)}</div></div>;
}

function ProAnalyticsPanel({ analytics, isPro, onUpgrade }: { analytics: ReturnType<typeof buildProPerformanceAnalytics>; isPro: boolean; onUpgrade: () => void }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-signal-blue"><BarChart3 size={18} /><h3 className="font-bold">Pro Analytics</h3></div>{!isPro && <Lock className="text-signal-amber" size={18} />}</div><div className={!isPro ? 'premium-lock opacity-70' : ''}><div className="grid gap-2 sm:grid-cols-3">{analytics.windows.map(item => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-3"><p className="text-xs font-bold text-slate-400">{item.label}</p><p className="text-2xl font-black">{item.summary.winRate}%</p><p className={item.summary.avgReturn >= 0 ? 'text-xs text-signal-green' : 'text-xs text-signal-red'}>{item.summary.avgReturn >= 0 ? '+' : ''}{item.summary.avgReturn}% avg</p></div>)}</div><div className="mt-3 grid gap-3"><AnalyticsBreakdownTable title="By symbol" rows={analytics.bySymbol} /><AnalyticsBreakdownTable title="By confidence" rows={analytics.byConfidenceTier} /><AnalyticsBreakdownTable title="By trader mode" rows={analytics.byMode} /></div></div>{!isPro && <div><p className="mt-3 text-sm text-slate-300">Pro analytics compares win rate and average return by symbol, confidence tier, trader mode, and 7/30/90 day windows.</p><button onClick={onUpgrade} className="mt-3 w-full rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber">Unlock Pro analytics</button></div>}</div>;
}

function NotificationsCard({ top, outcome, condition, preferences, events, dailyRecap, isPro, onToggle, onUpgrade }: { top: AssetSignal; outcome: SignalOutcome; condition: MarketCondition; preferences: AlertPreferences; events: AlertEventPreview[]; dailyRecap: DailyRecapPreview; isPro: boolean; onToggle: (key: AlertPreferenceKey, value: boolean) => void; onUpgrade: () => void }) {
  const alerts = events.length ? events.slice(0, 3).map(event => event.title + ': ' + event.body) : [
    top.symbol + " remains tonight's strongest signal at " + top.confidence + '% confidence.',
    'Previous signal result: ' + outcome + '.',
    condition === 'volatile' ? 'Volatile tape: widen your learning lens before reacting.' : condition === 'active' ? 'Active market: good conditions for reviewing signal quality.' : 'Calm market: fewer confirmations, more patience.'
  ];
  const toggles: [AlertPreferenceKey, string, string, boolean][] = [
    ['highConfidenceAlerts', 'High-confidence alerts', 'Instant ping when a 72%+ signal opens.', true],
    ['dailyRecap', 'Daily recap', 'One daily summary of wins, losses, and best receipt.', true],
    ['settlementAlerts', 'Settlement alerts', 'Notify when a tracked signal closes.', true],
    ['proOnlyAlerts', 'Pro-only alerts', 'Immediate Pro alert stream for premium signals.', isPro]
  ];
  return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-signal-blue"><BellRing size={18} /><h2 className="text-xl font-bold">Alerts + Daily Recap</h2></div><Mail size={18} className="text-slate-500" /></div>{dailyRecap && <div className="mb-3 rounded-2xl border border-signal-blue/20 bg-signal-blue/10 p-3"><p className="text-xs font-bold uppercase tracking-[.16em] text-signal-blue">Today’s recap</p><p className="mt-1 text-sm text-slate-200">{dailyRecap.body}</p><p className="mt-1 text-xs text-slate-400">Best: {dailyRecap.best || 'No closed signal yet'}</p></div>}<div className="space-y-2">{alerts.map(alert => <div key={alert} className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm text-slate-300">{alert}</div>)}</div><div className="mt-4 space-y-2">{toggles.map(([key, label, detail, enabled]) => <div key={key} className={!enabled ? 'opacity-60' : ''}><button disabled={!enabled} onClick={() => enabled ? onToggle(key, !preferences[key]) : onUpgrade()} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-left"><span><span className="block text-sm font-bold text-slate-100">{label}</span><span className="block text-xs text-slate-400">{enabled ? detail : 'Pro unlock required.'}</span></span><span className={preferences[key] && enabled ? 'rounded-full bg-signal-green/20 px-3 py-1 text-xs font-black text-signal-green' : 'rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-400'}>{preferences[key] && enabled ? 'ON' : 'OFF'}</span></button></div>)}</div></div>;
}

function ProLock({ isPro, onUpgrade, title, body }: { isPro: boolean; onUpgrade: () => void; title: string; body: string }) {
  return <div className={isPro ? 'rounded-3xl border border-signal-green/20 bg-signal-green/10 p-4' : 'rounded-3xl border border-signal-amber/20 bg-signal-amber/10 p-4'}>
    <div className="flex items-start gap-3">
      <div className={isPro ? 'rounded-2xl bg-signal-green/20 p-2 text-signal-green' : 'rounded-2xl bg-signal-amber/20 p-2 text-signal-amber'}>{isPro ? <ShieldCheck size={18} /> : <Lock size={18} />}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{isPro ? body : body}</p>
        {!isPro && <button onClick={onUpgrade} className="mt-3 rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-2 text-xs font-black text-signal-amber hover:bg-signal-amber/20">Unlock Pro</button>}
      </div>
    </div>
  </div>;
}

function AuthPanel({ authUser, plan, authEmail, setAuthEmail, authMessage, onMagicLink, onSignOut, onUpgrade, upgrading, checkoutSyncing }: { authUser: AuthUser; plan: Plan; authEmail: string; setAuthEmail: (v: string) => void; authMessage: string; onMagicLink: () => void; onSignOut: () => void; onUpgrade: () => void; upgrading: boolean; checkoutSyncing: boolean }) { return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2 text-signal-blue"><UserRound size={18} /><h2 className="text-xl font-bold">Account + Pro</h2></div>{authUser ? <><p className="text-sm text-slate-300">Signed in as <strong className="text-white">{authUser.email}</strong></p><p className="mt-2 text-2xl font-black">Plan: <span className={plan === 'pro' ? 'text-signal-green' : ''}>{checkoutSyncing ? 'SYNCING' : plan.toUpperCase()}</span></p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={onUpgrade} disabled={plan === 'pro' || checkoutSyncing} className="rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950 disabled:opacity-40">{checkoutSyncing ? 'Finalizing...' : plan === 'pro' ? 'Pro Active' : upgrading ? 'Opening...' : 'Upgrade $9/mo'}</button><button onClick={onSignOut} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold">Sign out</button></div></> : <><p className="text-sm text-slate-300">Enter the same email you use at checkout. Magic link is optional; Pro can sync by email.</p><input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email@example.com" className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-signal-blue/20" /><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={onMagicLink} className="rounded-2xl bg-signal-blue px-4 py-3 font-bold text-midnight-950">Send Magic Link</button><button onClick={onUpgrade} disabled={checkoutSyncing} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 font-bold text-signal-amber disabled:opacity-50">{checkoutSyncing ? 'Finalizing...' : upgrading ? 'Opening...' : 'Upgrade $9/mo'}</button></div></>}{authMessage && <p className="mt-3 text-xs text-slate-400">{authMessage}</p>}</div>; }
function JourneyCard({ visits, journey, completed }: { visits: number; journey: { title: string; stage: number; progress: number; note: string }; completed: number }) { return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2 text-signal-blue"><Trophy size={18} /><h2 className="text-xl font-bold">Your Signal Journey</h2></div><p className="text-2xl font-black">{journey.title}</p><p className="mt-1 text-sm text-slate-300">Stage {journey.stage} · {visits} visits · {completed}/4 ritual steps</p><div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-signal-blue" style={{ width: `${journey.progress}%` }} /></div><p className="mt-3 text-sm text-slate-300">{journey.note}</p></div>; }
function RitualCard({ ritual, mark }: { ritual: RitualState; mark: (key: keyof RitualState) => void }) { const items: [keyof RitualState, string][] = [['topSignal', 'Check Top Signal'], ['confidence', 'Review Confidence'], ['watchlist', 'Scan Watchlist'], ['market', 'Read Market Condition']]; return <div className="card rounded-3xl p-5"><div className="mb-3 flex items-center gap-2 text-signal-blue"><CheckCircle2 size={18} /><h2 className="text-xl font-bold">Tonight’s Ritual</h2></div><div className="space-y-2">{items.map(([key, label]) => <button key={key} onClick={() => mark(key)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${ritual[key] ? 'border-signal-green/30 bg-signal-green/10 text-signal-green' : 'border-white/10 bg-white/[.04] text-slate-200'}`}><span>{label}</span><CheckCircle2 size={18} /></button>)}</div></div>; }
function Glossary({ activeTerm, onJump, onClose }: { activeTerm: string; onJump: (term: string) => void; onClose: () => void }) {
  const terms = [
    ['Signal', 'A simplified read of current market posture. It is educational context, not a trading instruction.', 'Signals'],
    ['Confidence', 'How strongly the heuristic agrees with itself across trend, momentum, volatility, and multi-timeframe posture.', 'Signals'],
    ['Momentum', 'How much energy price action appears to have. Strong momentum means the move has force behind it.', 'Signals'],
    ['Trend', 'The general direction of price action over the current reading window.', 'Signals'],
    ['Volatility', 'How wide or unstable recent movement is. Higher volatility can increase opportunity and risk.', 'Signals'],
    ['MTF', 'Multi-timeframe weighting across short and longer views.', 'Signals'],
    ['Breakout', 'A move that pushes beyond a recent range or level with enough strength to matter.', 'Signals'],
    ['Divergence', 'When assets or indicators that usually move together start disagreeing.', 'Signals'],
    ['Win Rate', 'The share of decisive tracked outcomes marked as wins.', 'Metrics'],
    ['Action Rate', 'How often signals were acted on compared with ignored.', 'Metrics'],
    ['Watchlist', 'The assets a user chooses to follow closely. Guest mode defaults to BTC, ADA, and NIGHT.', 'Personalization'],
    ['Global Top Signal', 'The best-ranked signal across the full available signal universe, even outside the user watchlist.', 'Personalization'],
    ['Your Top Signal', 'The best-ranked signal inside the user watchlist.', 'Personalization'],
    ['Midnight Network', 'The app focus bundle of BTC, ADA, and NIGHT: macro liquidity, Cardano ecosystem, and Midnight ecosystem context.', 'Midnight Network'],
    ['NIGHT', 'The Midnight ecosystem asset ticker used by this app. Legacy MID aliases resolve to NIGHT.', 'Midnight Network'],
    ['Market condition', 'A plain-English read of whether the current tape is calm, active, or volatile.', 'Basics'],
    ['Data source', 'Shows whether live market prices loaded or the fallback dataset is protecting the app.', 'Basics'],
    ['Daily Ritual', 'A repeatable checklist that teaches users what to review before reacting.', 'Learning'],
    ['Journey', 'A lightweight progression system that rewards repeated learning behavior.', 'Learning']
  ] as const;
  const active = activeTerm || 'Signal';
  const activeId = 'glossary-' + active.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => document.getElementById(activeId)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }, [activeId]);
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
    <aside className="h-full w-full max-w-md overflow-auto border-l border-white/10 bg-midnight-950 p-6 shadow-soft">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-5 border-b border-white/10 bg-midnight-950/95 p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Learning Glossary</h2><p className="mt-1 text-sm text-slate-400">Click linked terms anywhere in the app to jump here.</p></div><button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2">Close</button></div>
        <div className="mt-4 flex flex-wrap gap-2">{terms.slice(0, 8).map(([term]) => <button key={term} onClick={() => onJump(term)} className={active === term ? 'rounded-full border border-signal-blue/50 bg-signal-blue/20 px-3 py-1 text-xs font-bold text-signal-blue' : 'rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-bold text-slate-300'}>{term}</button>)}</div>
      </div>
      <div className="space-y-3">{terms.map(([term, definition, group]) => <div id={'glossary-' + term.toLowerCase().replace(/[^a-z0-9]+/g, '-')} key={term} className={active === term ? 'rounded-2xl border border-signal-blue/50 bg-signal-blue/15 p-4 shadow-soft' : 'rounded-2xl border border-white/10 bg-white/[.04] p-4'}>
        <p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">{group}</p><p className="mt-1 font-bold text-signal-blue">{term}</p><p className="mt-1 text-sm text-slate-300">{definition}</p>
      </div>)}</div>
    </aside>
  </div>;
}

function PerformanceEngineCard({ engine, isPro, onUpgrade }: { engine: PerformanceEngine; isPro: boolean; onUpgrade: () => void }) {
  const rows = isPro ? engine.bySymbol.slice(0, 4) : engine.bySymbol.slice(0, 2);
  const bestType = engine.bestType?.label || 'Learning';
  return <div className="rounded-3xl border border-signal-green/25 bg-signal-green/10 p-4"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-green/30 bg-signal-green/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-green"><BarChart3 size={14} /> v15.7 performance engine</div><h3 className="text-xl font-black">Feedback now becomes signal performance.</h3><p className="mt-1 text-sm text-slate-300">Win rate, action rate, signal type, and symbol history now feed the visible confidence layer.</p></div>{!isPro && <button onClick={onUpgrade} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm font-bold text-signal-amber"><Lock className="mr-2 inline" size={16} /> Unlock deeper analytics</button>}</div><div className="grid gap-2 sm:grid-cols-4"><BriefCard label="Tracked feedback" value={String(engine.total)} detail="All recorded taps" /><BriefCard label="Win rate" value={engine.winRate ? engine.winRate + '%' : '—'} detail="Wins / decisive outcomes" /><BriefCard label="Action rate" value={engine.actionRate ? engine.actionRate + '%' : '—'} detail="Acted / total feedback" /><BriefCard label="Best type" value={bestType} detail={engine.bestType ? engine.bestType.winRate + '% win rate' : 'Needs feedback'} /></div><div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Feedback-informed confidence</p><p className="text-3xl font-black text-white">{engine.informedConfidence}%</p></div><p className="max-w-md text-right text-xs text-slate-400">{engine.sampleSize >= 3 ? 'Blends current signal posture with actual recorded outcomes.' : 'Collect at least 3 feedback events to override the static confidence score.'}</p></div></div><div className={isPro ? 'mt-3 grid gap-2 sm:grid-cols-2' : 'premium-lock mt-3 grid gap-2 opacity-75 sm:grid-cols-2'}>{rows.length ? rows.map(row => <PerformanceMiniRow key={row.label} row={row} />) : <p className="rounded-2xl border border-white/10 bg-white/[.03] p-3 text-sm text-slate-400">No performance rows yet. Use the feedback buttons below to start the engine.</p>}</div>{!isPro && <p className="mt-3 text-xs text-slate-500">Free shows the headline engine. Pro unlocks deeper symbol and signal-type breakdowns.</p>}</div>;
}
function PerformanceMiniRow({ row }: { row: PerformanceRow }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center justify-between gap-2"><p className="font-black">{row.label}</p><span className="rounded-full border border-white/10 bg-white/[.06] px-2 py-1 text-xs font-bold text-slate-200">{row.total} events</span></div><div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400"><span>{row.winRate || '—'}% win</span><span>{row.actionRate || '—'}% acted</span><span>{row.ignored} ignored</span></div></div>;
}

function FeedbackLoopCard({ signal, stats, globalStats, message, onFeedback }: { signal: AssetSignal; stats: FeedbackStats; globalStats: FeedbackStats; message: string; onFeedback: (action: FeedbackAction, outcome?: FeedbackOutcome) => void }) {
  return <div className="rounded-3xl border border-signal-blue/20 bg-signal-blue/10 p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-signal-blue"><DatabaseZap size={14} /> Feedback loop</div><h3 className="text-xl font-black">Did you act on {signal.symbol}?</h3><p className="mt-1 text-sm text-slate-300">v15.7 feeds every action into the performance engine while keeping personal and global signals separate.</p></div><div className="grid grid-cols-2 gap-2 text-center text-xs sm:min-w-[220px]"><div className="rounded-2xl border border-white/10 bg-white/[.05] p-3"><p className="text-slate-400">This signal</p><p className="text-2xl font-black">{stats.total}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.05] p-3"><p className="text-slate-400">All feedback</p><p className="text-2xl font-black">{globalStats.total}</p></div></div></div><div className="grid gap-2 sm:grid-cols-4"><button onClick={() => onFeedback('acted', 'win')} className="rounded-2xl border border-signal-green/30 bg-signal-green/10 px-3 py-3 text-sm font-black text-signal-green hover:bg-signal-green/15"><ThumbsUp className="mr-2 inline" size={16} /> Acted + Win</button><button onClick={() => onFeedback('acted', 'loss')} className="rounded-2xl border border-signal-red/30 bg-signal-red/10 px-3 py-3 text-sm font-black text-signal-red hover:bg-signal-red/15"><ThumbsDown className="mr-2 inline" size={16} /> Acted + Loss</button><button onClick={() => onFeedback('acted', 'neutral')} className="rounded-2xl border border-signal-amber/30 bg-signal-amber/10 px-3 py-3 text-sm font-black text-signal-amber hover:bg-signal-amber/15">Neutral</button><button onClick={() => onFeedback('ignored', null)} className="rounded-2xl border border-white/10 bg-white/[.05] px-3 py-3 text-sm font-black text-slate-200 hover:bg-white/10">Ignored</button></div><div className="mt-3 grid gap-2 sm:grid-cols-4"><BriefCard label="Acted" value={String(globalStats.acted)} detail="Total action taps" /><BriefCard label="Ignored" value={String(globalStats.ignored)} detail="Skipped signals" /><BriefCard label="Wins" value={String(globalStats.wins)} detail="User-marked wins" /><BriefCard label="User win rate" value={globalStats.winRate ? globalStats.winRate + '%' : '—'} detail="Wins / decisive" /></div>{message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm text-slate-200">{message}</p>}</div>;
}
