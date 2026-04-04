type BeaconProps = {
  size?: number;
};

export default function Beacon({ size = 120 }: BeaconProps) {
  return (
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <div
        style={{
          width: size,
          height: size,
          margin: "0 auto",
          borderRadius: "50%",
          boxShadow: "0 0 40px rgba(96,165,250,0.6)",
          background: "radial-gradient(circle, #60a5fa, transparent)"
        }}
      />
    </div>
  );
}
