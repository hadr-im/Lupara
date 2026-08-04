export function Avatar({ name, hue, size = 28 }: { name: string; hue: number; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-foreground ring-1 ring-border/50"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, oklch(0.55 0.2 ${hue}), oklch(0.7 0.2 ${(hue + 40) % 360}))`,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}