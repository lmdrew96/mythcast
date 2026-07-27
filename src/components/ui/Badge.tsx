export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`mc-badge ${className}`} {...props} />;
}
