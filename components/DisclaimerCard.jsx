'use client';

export default function DisclaimerCard({ state, setState }) {
  const accepted = state.acceptedDisclaimer;

  return (
    <div className="panel stack">
      <div className="row space-between">
        <h2 className="section-title">Agreement of Understanding</h2>
        <span className="badge">{accepted ? 'Accepted' : 'Pending'}</span>
      </div>
      <div className="muted small">
        Midnight Signal is an educational experience, not financial advice. This acceptance flag is synced per account so you do not have to re-accept on every device.
      </div>
      <button
        className={accepted ? 'ghost-button' : 'button'}
        onClick={() => setState((previous) => ({ ...previous, acceptedDisclaimer: !previous.acceptedDisclaimer }))}
      >
        {accepted ? 'Revoke acceptance' : 'Agree and Enter'}
      </button>
    </div>
  );
}
