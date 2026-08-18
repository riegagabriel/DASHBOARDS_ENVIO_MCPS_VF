interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
}

export default function StatCard({ label, value, caption, delta, deltaTone = "neutral" }: StatCardProps) {
  const badgeBg =
    deltaTone === "positive" ? "var(--green-bg)"
    : deltaTone === "negative" ? "var(--red-bg)"
    : "var(--blue-ghost)";
  const badgeFg =
    deltaTone === "positive" ? "var(--green)"
    : deltaTone === "negative" ? "var(--red)"
    : "var(--text-secondary)";

  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {delta && (
        <span className="stat-card__badge" style={{ background: badgeBg, color: badgeFg }}>
          {delta}
        </span>
      )}
      {caption && <p className="stat-card__caption">{caption}</p>}
    </div>
  );
}
