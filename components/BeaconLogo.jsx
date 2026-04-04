export default function BeaconLogo({ size = 88, animated = true }) {
  const rings = [
    { r: 10, dots: 6, opacity: 0.95 },
    { r: 18, dots: 8, opacity: 0.9 },
    { r: 28, dots: 10, opacity: 0.82 },
    { r: 40, dots: 12, opacity: 0.72 },
  ];

  const cx = 50;
  const cy = 50;

  function dotPositions(radius, count) {
    return Array.from({ length: count }, (_, i) => {
      const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Midnight Signal beacon logo"
        style={{ overflow: "visible", filter: "drop-shadow(0 0 18px rgba(139,168,255,.18))" }}
      >
        <defs>
          <radialGradient id="ms-core" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#DCE8FF" />
            <stop offset="38%" stopColor="#8BA8FF" />
            <stop offset="72%" stopColor="#6067F9" />
            <stop offset="100%" stopColor="#0033AD" />
          </radialGradient>
          <radialGradient id="ms-halo" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(139,168,255,.42)" />
            <stop offset="100%" stopColor="rgba(139,168,255,0)" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="46" fill="rgba(139,168,255,.04)" />

        {animated ? (
          <>
            <circle cx="50" cy="50" r="13" fill="none" stroke="rgba(139,168,255,.28)" strokeWidth="1.5">
              <animate attributeName="r" values="13;17;13" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".95;.28;.95" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(96,103,249,.18)" strokeWidth="1.2">
              <animate attributeName="r" values="24;27;24" dur="3.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".7;.22;.7" dur="3.3s" repeatCount="indefinite" />
            </circle>
          </>
        ) : null}

        <circle cx="50" cy="50" r="17" fill="url(#ms-halo)" />

        {rings.map((ring, ringIndex) => (
          <g key={ring.ringIndex ?? ringIndex}>
            <circle
              cx="50"
              cy="50"
              r={ring.r}
              fill="none"
              stroke={ringIndex % 2 === 0 ? "rgba(139,168,255,.18)" : "rgba(96,103,249,.16)"}
              strokeWidth="1.1"
            />
            {dotPositions(ring.r, ring.dots).map((dot, dotIndex) => (
              <circle
                key={`${ringIndex}-${dotIndex}`}
                cx={dot.x}
                cy={dot.y}
                r={ringIndex === 0 ? 1.8 : ringIndex === 1 ? 1.55 : 1.35}
                fill={dotIndex % 3 === 0 ? "#DCE8FF" : dotIndex % 2 === 0 ? "#8BA8FF" : "#6067F9"}
                opacity={ring.opacity}
              >
                {animated ? (
                  <animate
                    attributeName="opacity"
                    values={`${ring.opacity};${Math.max(0.35, ring.opacity - 0.35)};${ring.opacity}`}
                    dur={`${2.3 + ringIndex * 0.45}s`}
                    begin={`${dotIndex * 0.12}s`}
                    repeatCount="indefinite"
                  />
                ) : null}
              </circle>
            ))}
          </g>
        ))}

        <circle cx="50" cy="50" r="5.4" fill="url(#ms-core)" />
      </svg>
    </div>
  );
}
