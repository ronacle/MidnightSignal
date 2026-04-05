export default function SignalBeacon({ size = 120 }) {
  const rings = [22, 38, 54];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="Midnight Signal Beacon" role="img">
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="40%" stopColor="#8BA8FF" />
          <stop offset="100%" stopColor="#0033AD" stopOpacity="0.10" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="rgba(14, 25, 44, 0.35)" stroke="rgba(96, 165, 250, 0.18)" />
      <circle cx="60" cy="60" r="12" fill="url(#coreGlow)" />
      <circle cx="60" cy="60" r="7" fill="#e0f2fe" />
      {rings.map((radius, idx) => (
        <g key={radius} opacity={0.75 - idx * 0.12}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(139,168,255,0.24)" strokeWidth="1.25" />
          {Array.from({ length: 12 + idx * 4 }).map((_, pointIdx, arr) => {
            const angle = (pointIdx / arr.length) * Math.PI * 2;
            const x = 60 + Math.cos(angle) * radius;
            const y = 60 + Math.sin(angle) * radius;
            return <circle key={pointIdx} cx={x} cy={y} r={1.8 + idx * 0.2} fill="#8BA8FF" />;
          })}
        </g>
      ))}
    </svg>
  );
}
