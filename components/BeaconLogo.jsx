export default function BeaconLogo({ size = 88 }) {
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
        style={{ overflow: "visible", filter: "drop-shadow(0 0 16px rgba(139,168,255,.16))" }}
      >
        <defs>
          <radialGradient id="ms-core-static" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#DCE8FF" />
            <stop offset="38%" stopColor="#8BA8FF" />
            <stop offset="72%" stopColor="#6067F9" />
            <stop offset="100%" stopColor="#0033AD" />
          </radialGradient>
          <radialGradient id="ms-halo-static" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(139,168,255,.30)" />
            <stop offset="100%" stopColor="rgba(139,168,255,0)" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="46" fill="rgba(139,168,255,.035)" />
        <circle cx="50" cy="50" r="16" fill="url(#ms-halo-static)" />

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
            {dotPositions(ring.r, ring.dots).map((dot, dotIndex) => (
              <circle
                key={`${ringIndex}-${dotIndex}`}
                cx={dot.x}
                cy={dot.y}
                r={ringIndex === 0 ? 1.8 : ringIndex === 1 ? 1.55 : 1.35}
                fill={dotIndex % 3 === 0 ? "#DCE8FF" : dotIndex % 2 === 0 ? "#8BA8FF" : "#6067F9"}
                opacity={ring.opacity}
              />
            ))}
          </g>
        ))}

        <circle cx="50" cy="50" r="5.4" fill="url(#ms-core-static)" />
      </svg>
    </div>
  );
}
