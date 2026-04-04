type BeaconProps = {
  size?: number;
  labels?: boolean;
};

const words = ["Data", "Information", "Knowledge", "Understanding", "Wisdom"];

export default function Beacon({ size = 128, labels = false }: BeaconProps) {
  const center = size / 2;
  const ring1 = size * 0.28;
  const ring2 = size * 0.46;
  const ring3 = size * 0.66;
  const dotSize = Math.max(6, Math.round(size * 0.045));
  const coreSize = Math.max(14, Math.round(size * 0.1));

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: labels ? size + 44 : size,
        margin: "0 auto"
      }}
    >
      {[ring1, ring2, ring3].map((ring, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: center,
            left: center,
            width: ring,
            height: ring,
            borderRadius: "50%",
            border: "1px solid rgba(96,165,250,0.35)",
            transform: "translate(-50%, -50%)",
            boxShadow: i === 2 ? "0 0 30px rgba(96,165,250,0.08)" : "none"
          }}
        />
      ))}

      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 6;
        const x = Math.cos(angle) * (ring2 / 2);
        const y = Math.sin(angle) * (ring2 / 2);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: center + y,
              left: center + x,
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              background: "rgba(147,197,253,0.95)",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 10px rgba(147,197,253,0.5)"
            }}
          />
        );
      })}

      <div
        style={{
          width: coreSize,
          height: coreSize,
          background: "#60a5fa",
          borderRadius: "50%",
          position: "absolute",
          top: center,
          left: center,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 18px rgba(96,165,250,0.8)"
        }}
      />

      {labels && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            transform: "translateX(-50%)",
            width: "100%",
            textAlign: "center",
            fontSize: Math.max(11, Math.round(size * 0.04)),
            opacity: 0.78,
            whiteSpace: "nowrap"
          }}
        >
          {words.join(" • ")}
        </div>
      )}
    </div>
  );
}
