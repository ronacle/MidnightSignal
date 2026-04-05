export default function Badge({ confidence, label }: { confidence: number; label: string }) {
  const tone = confidence >= 66 ? "green" : confidence <= 47 ? "red" : "yellow";
  return <span className={`badge ${tone}`}>{label}</span>;
}
