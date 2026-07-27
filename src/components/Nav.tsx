"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Generator Preview" },
  { href: "/world", label: "World Output" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-foreground/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-8 py-3">
        <Link href="/" className="font-display text-lg">
          Mythcast
        </Link>
        <div className="flex gap-4 font-mono text-xs tracking-wide uppercase">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "opacity-100" : "opacity-50 transition-opacity hover:opacity-80"}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
