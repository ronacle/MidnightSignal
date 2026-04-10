
'use client';

import { useMemo, useState } from 'react';

const USER_TYPES = [
  { value: 'Beginner', label: 'Beginner', hint: 'More explanation and guidance.' },
  { value: 'Active trader', label: 'Active trader', hint: 'Faster reads and tighter scan flow.' },
  { value: 'Long-term', label: 'Long-term', hint: 'More trend context and patience cues.' },
];

const GOALS = [
  { value: 'learn', label: 'Learn', hint: 'Understand why signals change.' },
  { value: 'track', label: 'Track signals', hint: 'Follow posture and confidence across assets.' },
  { value: 'alerts', label: 'Get alerts', hint: 'Stay focused on meaningful shifts.' },
];

export default function OnboardingModal({ onComplete }) {
  const [userType, setUserType] = useState('');
  const [goal, setGoal] = useState('');
  const canStart = Boolean(userType && goal);

  const modeHint = useMemo(() => {
    if (!userType && !goal) return 'Choose how you want Midnight Signal to feel on your first visit.';
    if (!userType) return 'Pick the style of read you want each night.';
    if (!goal) return 'Now choose what you want Midnight Signal to optimize for.';
    return `Starting in ${userType} mode with a focus on ${goal.replace(/-/g, ' ')}.`;
  }, [userType, goal]);

  return (
    <div className="first-run-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="first-run-card">
        <div className="first-run-eyebrow">Quick setup</div>
        <h2 id="onboarding-title" className="first-run-title">Tell Midnight Signal how to guide you</h2>
        <p className="muted small">This only appears once. You can change these preferences later in settings.</p>

        <div className="first-run-section">
          <div className="first-run-section-title">What type of user are you?</div>
          <div className="first-run-choice-grid">
            {USER_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`first-run-choice ${userType === option.value ? 'is-active' : ''}`}
                onClick={() => setUserType(option.value)}
              >
                <span className="first-run-choice-title">{option.label}</span>
                <span className="first-run-choice-hint">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="first-run-section">
          <div className="first-run-section-title">What do you want from Midnight Signal?</div>
          <div className="first-run-choice-grid compact">
            {GOALS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`first-run-choice ${goal === option.value ? 'is-active' : ''}`}
                onClick={() => setGoal(option.value)}
              >
                <span className="first-run-choice-title">{option.label}</span>
                <span className="first-run-choice-hint">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="first-run-summary muted small">{modeHint}</div>

        <div className="first-run-actions">
          <button type="button" className="primary-button" disabled={!canStart} onClick={() => onComplete({ userType, goal })}>
            Start with this setup
          </button>
        </div>
      </div>
    </div>
  );
}
