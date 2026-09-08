import { colors, radius } from "@/lib/design-tokens";

// Maps Clerk's theming variables (https://clerk.com/docs/customization/overview)
// onto the dark workspace design tokens, applied globally via ClerkProvider so
// every Clerk-rendered component (SignIn, SignUp, and later UserButton, etc.)
// matches without touching Clerk's internal component markup.
export const clerkAppearance = {
  variables: {
    colorPrimary: colors.emerald,
    colorPrimaryForeground: colors.emeraldForeground,
    colorDanger: colors.danger,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorNeutral: colors.foreground,
    colorForeground: colors.foreground,
    colorMutedForeground: colors.mutedForeground,
    colorBackground: colors.surface,
    colorInputForeground: colors.foreground,
    colorInput: colors.background,
    colorBorder: colors.border,
    fontFamily: "var(--font-sans)",
    borderRadius: `${radius.input}px`,
  },
};
