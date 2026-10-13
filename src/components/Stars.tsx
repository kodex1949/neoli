export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="stars" role="img" aria-label={`${value.toFixed(1).replace(".", ",")} sur 5`} style={{ ["--s" as string]: `${size}px` }}>
      <span className="stars__fill" style={{ width: `${Math.max(0, Math.min(5, value)) * 20}%` }} />
    </span>
  );
}
