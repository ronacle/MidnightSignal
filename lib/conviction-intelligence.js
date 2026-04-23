function toMs(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function getConvictionComparison({
  currentSymbol = '',
  previousSymbol = '',
  currentScore = null,
  previousScore = null,
  currentCapturedAt = null,
  previousCapturedAt = null,
  minFreshGapMinutes = 15,
  maxCleanDelta = 15,
  minMeaningfulDelta = 3,
} = {}) {
  const current = String(currentSymbol || '').toUpperCase();
  const previous = String(previousSymbol || '').toUpperCase();

  if (!current || !previous) {
    return { mode: 'first-read', comparable: false, delta: 0, absDelta: 0 };
  }

  if (current !== previous) {
    return { mode: 'rotation', comparable: false, delta: 0, absDelta: 0 };
  }

  const nextScore = Number(currentScore);
  const priorScore = Number(previousScore);
  if (!Number.isFinite(nextScore) || !Number.isFinite(priorScore)) {
    return { mode: 'steady', comparable: false, delta: 0, absDelta: 0 };
  }

  const currentMs = toMs(currentCapturedAt);
  const previousMs = toMs(previousCapturedAt);
  const gapMinutes = currentMs && previousMs ? Math.abs(currentMs - previousMs) / 60000 : null;
  if (Number.isFinite(gapMinutes) && gapMinutes < minFreshGapMinutes) {
    return { mode: 'steady', comparable: false, delta: 0, absDelta: 0, gapMinutes };
  }

  const delta = Math.round(nextScore - priorScore);
  const absDelta = Math.abs(delta);

  if (absDelta < minMeaningfulDelta) {
    return { mode: 'steady', comparable: true, delta, absDelta, gapMinutes };
  }

  if (absDelta > maxCleanDelta) {
    return { mode: 'too-far-apart', comparable: false, delta, absDelta, gapMinutes };
  }

  return {
    mode: delta > 0 ? 'improving' : 'fading',
    comparable: true,
    delta,
    absDelta,
    gapMinutes,
  };
}

export function getConvictionDirectionLabel(comparison) {
  if (!comparison) return 'steady';
  if (comparison.mode === 'improving') return 'improving';
  if (comparison.mode === 'fading') return 'fading';
  if (comparison.mode === 'rotation') return 'rotated';
  if (comparison.mode === 'too-far-apart') return 'reset';
  return 'steady';
}

export function getConvictionPointLabel(comparison, { allowPoints = true } = {}) {
  if (!allowPoints || !comparison?.comparable) return null;
  if (!['improving', 'fading'].includes(comparison.mode)) return null;
  return `${comparison.delta > 0 ? '+' : '-'}${comparison.absDelta} pts`;
}


export function getConvictionBand(score = null) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'Developing';
  if (value >= 75) return 'High';
  if (value >= 55) return 'Moderate';
  return 'Cautious';
}

export function getConvictionBehavior(comparison, fallbackState = 'Stable') {
  if (comparison?.mode === 'rotation') return 'Resetting';
  if (comparison?.mode === 'too-far-apart') return 'Reframing';
  if (comparison?.mode === 'improving') return 'Building';
  if (comparison?.mode === 'fading') return 'Weakening';

  const state = String(fallbackState || 'Stable').toLowerCase();
  if (state === 'rising') return 'Building';
  if (state === 'weakening') return 'Weakening';
  return 'Stable';
}

export function getConvictionDescriptor({ score = null, comparison = null, fallbackState = 'Stable' } = {}) {
  return `${getConvictionBand(score)} · ${getConvictionBehavior(comparison, fallbackState)}`;
}
