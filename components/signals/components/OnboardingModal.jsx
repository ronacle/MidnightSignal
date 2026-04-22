import { useState } from 'react';

export default function OnboardingModal({ onComplete }) {
  const [userType, setUserType] = useState(null);
  const [goal, setGoal] = useState(null);

  const canStart = Boolean(userType && goal);

  const handleStart = () => {
    const payload = {
      userType,
      onboardingGoal: goal,
      onboardingCompletedAt: new Date().toISOString(),
    };

    localStorage.setItem("ms_onboarded", "true");
    localStorage.setItem("ms_onboarding_profile", JSON.stringify(payload));

    if (onComplete) onComplete(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Quick Setup</h2>

        <div>
          <button type="button" onClick={() => setUserType('beginner')}>Beginner</button>
          <button type="button" onClick={() => setUserType('active')}>Active</button>
          <button type="button" onClick={() => setUserType('long')}>Long-term</button>
        </div>

        <div>
          <button type="button" onClick={() => setGoal('learn')}>Learn</button>
          <button type="button" onClick={() => setGoal('track')}>Track</button>
          <button type="button" onClick={() => setGoal('alerts')}>Alerts</button>
        </div>

        <button type="button" disabled={!canStart} onClick={handleStart}>
          Start
        </button>
      </div>
    </div>
  );
}
