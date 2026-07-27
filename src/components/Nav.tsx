"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

const LINKS = [{ href: "/world", label: "World Output" }];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-foreground/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-8 py-3">
        <Link href="/" className="font-display text-lg">
          Mythcast
        </Link>
        <div className="flex items-center gap-4 font-mono text-xs tracking-wide uppercase">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "opacity-100" : "opacity-50 transition-opacity hover:opacity-80"}
            >
              {link.label}
            </Link>
          ))}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="opacity-50 transition-opacity hover:opacity-80">
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
