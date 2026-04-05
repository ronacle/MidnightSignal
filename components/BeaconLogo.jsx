export default function BeaconLogo({ size = 88, animated = false }) {
  const rings = [
    { r: 10, dots: 6, opacity: 0.95, duration: 8 },
    { r: 18, dots: 8, opacity: 0.9, duration: 12 },
    { r: 28, dots: 10, opacity: 0.82, duration: 16 },
    { r: 40, dots: 12, opacity: 0.72, duration: 22 },
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
          <radialGradient id="ms-core-static" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#DCE8FF" />
            <stop offset="38%" stopColor="#8BA8FF" />
            <stop offset="72%" stopColor="#6067F9" />
            <stop offset="100%" stopColor="#0033AD" />
          </radialGradient>
          <radialGradient id="ms-halo-static" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(139,168,255,.34)" />
            <stop offset="100%" stopColor="rgba(139,168,255,0)" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="46" fill="rgba(139,168,255,.035)" />
        <circle cx="50" cy="50" r="18" fill="url(#ms-halo-static)">
          {animated ? <animate attributeName="r" values="16;18;16" dur="3.6s" repeatCount="indefinite" /> : null}
          {animated ? <animate attributeName="opacity" values="0.8;1;0.8" dur="3.6s" repeatCount="indefinite" /> : null}
        </circle>

        {rings.map((ring, ringIndex) => (
          <g key={ringIndex}>
            <circle
              cx="50"
              cy="50"
              r={ring.r}
              fill="none"
              stroke={ringIndex % 2 === 0 ? "rgba(139,168,255,.18)" : "rgba(96,103,249,.16)"}
              strokeWidth="1.15"
            />
            {animated ? (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${cx} ${cy}`}
                to={`${ringIndex % 2 === 0 ? 360 : -360} ${cx} ${cy}`}
                dur={`${ring.duration}s`}
                repeatCount="indefinite"
              />
            ) : null}
            {dotPositions(ring.r, ring.dots).map((dot, dotIndex) => (
              <g key={`${ringIndex}-${dotIndex}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={dot.x}
                  y2={dot.y}
                  stroke={dotIndex % 2 === 0 ? "rgba(139,168,255,.12)" : "rgba(96,103,249,.10)"}
                  strokeWidth="0.6"
                />
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={ringIndex === 0 ? 1.8 : ringIndex === 1 ? 1.55 : 1.35}
                  fill={dotIndex % 3 === 0 ? "#DCE8FF" : dotIndex % 2 === 0 ? "#8BA8FF" : "#6067F9"}
                  opacity={ring.opacity}
                >
                  {animated ? <animate attributeName="opacity" values={`${ring.opacity};${Math.min(1, ring.opacity + 0.16)};${ring.opacity}`} dur={`${2.6 + ringIndex * 0.7}s`} repeatCount="indefinite" /> : null}
                </circle>
              </g>
            ))}
          </g>
        ))}

        <circle cx="50" cy="50" r="5.4" fill="url(#ms-core-static)">
          {animated ? <animate attributeName="r" values="5.1;5.8;5.1" dur="2.8s" repeatCount="indefinite" /> : null}
        </circle>
      </svg>
    </div>
  );
}
