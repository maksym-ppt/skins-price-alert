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

// Predefined weapon types for CS2 items
export const WEAPON_TYPES = [
  "Equipment",
  "Gloves",
  "Knife",
  "Machinegun",
  "Pistol",
  "Rifle",
  "Shotgun",
  "SMG",
  "Sniper Rifle",
] as const;

export type WeaponType = (typeof WEAPON_TYPES)[number];

// Skin conditions for CS2 items
export const SKIN_CONDITIONS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
] as const;

export type SkinCondition = (typeof SKIN_CONDITIONS)[number];

// Item categories
export const ITEM_CATEGORIES = {
  WEAPON: ["Normal", "StatTrak™", "Souvenir"],
  KNIFE: ["Normal ★", "★ StatTrak™"],
  GLOVES: ["Normal ★"],
} as const;

export type WeaponCategory = (typeof ITEM_CATEGORIES.WEAPON)[number];
export type KnifeCategory = (typeof ITEM_CATEGORIES.KNIFE)[number];
export type GloveCategory = (typeof ITEM_CATEGORIES.GLOVES)[number];

// Category ID mapping for button callbacks (to avoid special characters)
export const CATEGORY_IDS = {
  Normal: "normal",
  "StatTrak™": "stattrak",
  Souvenir: "souvenir",
  "Normal ★": "normal_star",
  "★ StatTrak™": "star_stattrak",
} as const;

export type CategoryId = (typeof CATEGORY_IDS)[keyof typeof CATEGORY_IDS];

// Reverse mapping from ID to display name
export const CATEGORY_DISPLAY_NAMES: Record<CategoryId, string> = {
  normal: "Normal",
  stattrak: "StatTrak™",
  souvenir: "Souvenir",
  normal_star: "Normal ★",
  star_stattrak: "★ StatTrak™",
};
