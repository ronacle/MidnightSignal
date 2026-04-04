export default function Beacon({ size = 320, labels = true }: { size?: number; labels?: boolean }) {
  return (
    <div className="signal-wrap">
      <svg viewBox="0 0 320 320" className="signal-svg" style={{maxWidth:size}} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="beacon-grad" x1="50" y1="285" x2="270" y2="35">
            <stop stopColor="#3E6FFF" />
            <stop offset="0.55" stopColor="#63C8FF" />
            <stop offset="1" stopColor="#9AF1FF" />
          </linearGradient>
        </defs>

        <g className="beacon-glow">
          <g className="ring-slow">
            <circle cx="160" cy="160" r="88" stroke="url(#beacon-grad)" strokeWidth="8" strokeLinecap="round" pathLength="360" strokeDasharray="20 16" />
          </g>
          <g className="ring-reverse">
            <circle cx="160" cy="160" r="60" stroke="url(#beacon-grad)" strokeWidth="8" strokeLinecap="round" pathLength="360" strokeDasharray="56 16" />
          </g>
          <g className="ring-mid">
            <circle cx="160" cy="160" r="34" stroke="url(#beacon-grad)" strokeWidth="8" strokeLinecap="round" pathLength="360" strokeDasharray="342 18" />
          </g>
        </g>

        <g transform="translate(160 160)">
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const cx = Math.cos(a) * 108;
            const cy = Math.sin(a) * 108;
            return (
              <circle
                key={i}
                className={i % 2 === 0 ? "data-dot beacon-glow" : "data-dot alt beacon-glow"}
                cx={cx}
                cy={cy}
                r={i % 2 === 0 ? 2.65 : 2.15}
                fill="#C8F6FF"
              />
            );
          })}
        </g>

        <g className="core-pulse beacon-glow">
          <circle cx="160" cy="160" r="18" fill="rgba(154,241,255,.18)" />
          <circle cx="160" cy="160" r="10" fill="url(#beacon-grad)" />
        </g>

        {labels ? (
          <>
            <text x="160" y="24" fill="#8C99AD" fontSize="12" letterSpacing="0.22em" textAnchor="middle">DATA</text>
            <text x="284" y="120" fill="#8C99AD" fontSize="12" letterSpacing="0.18em" textAnchor="middle">INFO</text>
            <text x="252" y="250" fill="#8C99AD" fontSize="12" letterSpacing="0.10em" textAnchor="middle">KNOWLEDGE</text>
            <text x="70" y="250" fill="#8C99AD" fontSize="12" letterSpacing="0.08em" textAnchor="middle">UNDERSTANDING</text>
            <text x="160" y="164" fill="#F5F7FB" fontSize="12" letterSpacing="0.18em" textAnchor="middle">WISDOM</text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
