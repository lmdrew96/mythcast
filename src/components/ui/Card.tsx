export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mc-card p-4 ${className}`} {...props} />;
}
