export type SubscriptionTier = "free" | "premium" | "pro";

export interface TierLimits {
  max_alerts: number;
  price_checks_per_minute: number;
}

export const DEFAULT_TIER: SubscriptionTier = "free";

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { max_alerts: 1, price_checks_per_minute: 10 },
  premium: { max_alerts: 10, price_checks_per_minute: 30 },
  pro: { max_alerts: 20, price_checks_per_minute: 60 },
};

export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: "Free",
  premium: "Premium",
  pro: "Pro",
};
