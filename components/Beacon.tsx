export default function Beacon() {
  return (
    <div style={{ position: "relative", width: 128, height: 128, margin: "0 auto" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 36 * i,
            height: 36 * i,
            borderRadius: "50%",
            border: "1px solid rgba(96,165,250,0.35)",
            transform: "translate(-50%, -50%)",
            boxShadow: i === 3 ? "0 0 30px rgba(96,165,250,0.08)" : "none"
          }}
        />
      ))}

      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (Math.PI * 2 * i) / 6;
        const x = Math.cos(angle) * 46;
        const y = Math.sin(angle) * 46;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(147,197,253,0.95)",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              boxShadow: "0 0 10px rgba(147,197,253,0.5)"
            }}
          />
        );
      })}

      <div
        style={{
          width: 14,
          height: 14,
          background: "#60a5fa",
          borderRadius: "50%",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 18px rgba(96,165,250,0.8)"
        }}
      />
    </div>
  );
}
