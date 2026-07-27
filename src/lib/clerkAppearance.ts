/**
 * Shared Clerk appearance so the modal sign-in (ClerkProvider-level) and the
 * full-page /sign-in, /sign-up routes render the same parchment/ink shell
 * and Fraunces display font instead of diverging Clerk surfaces.
 */
export const clerkAppearance = {
  variables: {
    colorBackground: "var(--background)",
    colorForeground: "var(--foreground)",
    colorPrimary: "var(--foreground)",
    colorInputBackground: "var(--background)",
    colorInputForeground: "var(--foreground)",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    card: "border border-foreground/15 shadow-none",
    headerTitle: "font-display",
    formButtonPrimary: "mc-button-primary normal-case shadow-none",
  },
} as const;
