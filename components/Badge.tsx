export default function Badge({ confidence, label }: { confidence: number; label: string }) {
  const tone =
    confidence >= 66 ? "badge green" :
    confidence <= 47 ? "badge red" :
    "badge yellow";

  return <span className={tone}>{label}</span>;
}
