'use client';

import { useState } from 'react';

export default function CollapsiblePanel({ title, subtitle = '', defaultOpen = false, className = '', children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`collapsible-shell ${className}`.trim()} aria-label={title}>
      <button type="button" className="collapsible-trigger card" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div>
          <div className="eyebrow">{title}</div>
          <div className="muted small">{subtitle}</div>
        </div>
        <span className="collapsible-indicator">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="collapsible-content">{children}</div> : null}
    </section>
  );
}
