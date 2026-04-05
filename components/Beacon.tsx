export default function Beacon() {
  const rings = [42, 70, 102, 134];
  const pulses = [52, 80, 108];
  return (
    <div className="beacon-wrap" aria-hidden="true">
      <div className="beacon">
        {rings.map((size) => <div key={size} className="beacon-ring" style={{ width: size, height: size }} />)}
        {pulses.map((size, index) => <div key={size} className="beacon-pulse" style={{ width: size, height: size, animationDelay: `${index * 0.55}s` }} />)}
        <div className="beacon-center" />
      </div>
    </div>
  );
}
