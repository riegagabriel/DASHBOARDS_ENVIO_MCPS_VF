interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

export default function StatCard({ label, value, caption, delta, deltaTone = "neutral" }: StatCardProps) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900 mt-1">{value}</p>
      {delta && (
        <span className={`inline-block mt-1 text-xs font-medium rounded-full px-2 py-0.5 ${TONE_CLASSES[deltaTone]}`}>
          {delta}
        </span>
      )}
      {caption && <p className="text-xs text-slate-500 mt-1 max-w-[16rem]">{caption}</p>}
    </div>
  );
}
