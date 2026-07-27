// Outlined rather than solid-filled by design: a filled button would need to
// guess a legible text color against 5 different --mc-primary accents (one
// per theme, each a different lightness), which isn't reliably solvable
// from a single hex value. Outline-on-surface reuses the background/text
// pair the palette system already guarantees is legible, and reads closer
// to a field-guide's restrained chrome than a SaaS call-to-action anyway.

type ButtonVariant = "primary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  const variantClass = variant === "primary" ? "mc-button-primary" : "mc-button-ghost";

  return <button className={`${base} ${variantClass} ${className}`} {...props} />;
}
