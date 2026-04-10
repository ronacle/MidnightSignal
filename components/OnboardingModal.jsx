'use client';

export default function OnboardingModal({ onboardingStep = 1, onboardingProfile, onboardingSummary, onApplyChoice, onNext, onBack, onComplete }) {
  return (
    <div className="ms-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ms-onboarding-title">
      <div className="ms-modal-card card">
        <div className="onboarding-head">
          <div>
            <div className="eyebrow">First-time setup</div>
            <h2 id="ms-onboarding-title" className="section-title">Make Midnight Signal click in under a minute</h2>
          </div>
          <span className="badge glow-badge">Step {onboardingStep} of 2</span>
        </div>
        {onboardingStep === 1 ? (
          <>
            <p className="muted small">Choose the path that feels closest to how you actually use the market.</p>
            <div className="onboarding-option-grid">
              {['Beginner', 'Active trader', 'Long-term'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`onboarding-option ${onboardingProfile?.userType === option ? 'is-active' : ''}`}
                  onClick={() => onApplyChoice?.({ userType: option })}
                >
                  <strong>{option}</strong>
                  <span>{option === 'Beginner' ? 'Keep explanations visible and the flow calmer.' : option === 'Active trader' ? 'Prioritize quicker reads and tighter reaction loops.' : 'Bias toward steadier posture and bigger timeframe context.'}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-actions">
              <button type="button" className="primary-button" onClick={onNext}>Continue</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted small">Now choose what you want Midnight Signal to do for you first.</p>
            <div className="onboarding-option-grid compact">
              {['Learn', 'Track signals', 'Get alerts'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`onboarding-option ${onboardingProfile?.goal === option ? 'is-active' : ''}`}
                  onClick={() => onApplyChoice?.({ goal: option })}
                >
                  <strong>{option}</strong>
                  <span>{option === 'Learn' ? 'Lead with plain-English guidance and why it matters.' : option === 'Track signals' ? 'Center the board, watchlist, and posture shifts.' : 'Surface the most meaningful changes and notification-ready moves.'}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-summary">
              <div className="onboarding-summary-title">{onboardingSummary?.title}</div>
              <div className="muted small">{onboardingSummary?.detail}</div>
            </div>
            <div className="onboarding-actions">
              <button type="button" className="ghost-button" onClick={onBack}>Back</button>
              <button type="button" className="primary-button" onClick={onComplete}>Start tonight&apos;s signal</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
