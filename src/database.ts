import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  DEFAULT_TIER,
  TIER_LIMITS,
  WEAPON_TYPES,
  WeaponType,
} from "./constants";

// Load environment variables from .env file
config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is required in environment variables"
  );
}

if (!supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is required in environment variables"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for server-side operations (bypass RLS)
export const adminSupabase = createClient(
  supabaseUrl,
  serviceRoleKey || supabaseKey,
  {
    auth: { persistSession: false },
  }
);

// User interface
export interface User {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  preferences?: {
    currency: string;
    language: string;
    notifications: boolean;
  };
  limits?: {
    max_alerts: number;
    price_checks_per_minute: number;
    tier: "free" | "premium" | "pro";
  };
  usage?: {
    alerts_created: number;
    price_checks_this_minute: number;
    last_price_check: string;
  };
}

// CS2 Item interface
export interface CS2Item {
  id: string;
  name: string;
  weapon_name: string;
  weapon_type: WeaponType;
  skin_name?: string;
  rarity: string;
  rarity_definition?: string;
  rarity_color?: string;
  collection?: string;
  introduced_date?: string;
  created_at: string;
  updated_at: string;
}

// Price alert interface
export interface PriceAlert {
  id: string;
  user_id: string;
  item_name: string;
  item_id?: string;
  target_price: number;
  current_price?: number;
  is_active: boolean;
  alert_type: "absolute" | "percentage_drop" | "percentage_increase";
  percentage_threshold?: number;
  base_price?: number;
  created_at: string;
  updated_at: string;
}

// Price cache interface
export interface PriceCache {
  id: string;
  item_name: string;
  item_id?: string;
  price: number;
  currency: string;
  volume?: number;
  median_price?: number;
  success: boolean;
  cached_at: string;
  expires_at: string;
}

// Historical price data interface
export interface PriceHistory {
  id: string;
  item_name: string;
  item_id?: string;
  price: number;
  currency: string;
  volume?: number;
  median_price?: number;
  success: boolean;
  recorded_at: string;
}

// User registration/management functions
export class UserService {
  // Auto-register user when they start the bot
  static async registerUser(
    telegramId: string | number,
    userData: {
      username?: string;
      first_name?: string;
      last_name?: string;
    }
  ): Promise<User | null> {
    try {
      const telegramIdText = String(telegramId);
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", telegramIdText)
        .single();

      if (existingUser) {
        // Update user info if needed
        const { data: updatedUser } = await supabase
          .from("users")
          .update({
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            updated_at: new Date().toISOString(),
          })
          .eq("telegram_id", telegramIdText)
          .select()
          .single();

        return updatedUser;
      }

      // Create new user with default limits
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          telegram_id: telegramIdText,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          preferences: {
            currency: "USD",
            language: "en",
            notifications: true,
          },
          limits: {
            max_alerts: TIER_LIMITS[DEFAULT_TIER].max_alerts,
            price_checks_per_minute:
              TIER_LIMITS[DEFAULT_TIER].price_checks_per_minute,
            tier: DEFAULT_TIER,
          },
          usage: {
            alerts_created: 0,
            price_checks_this_minute: 0,
            last_price_check: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating user:", error);
        return null;
      }

      return newUser;
    } catch (error) {
      console.error("Error in registerUser:", error);
      return null;
    }
  }

  // Get user by Telegram ID
  static async getUser(telegramId: string | number): Promise<User | null> {
    try {
      const telegramIdText = String(telegramId);
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", telegramIdText)
        .single();

      if (error) {
        console.error("Error getting user:", error);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      return null;
    }
  }

  // Check if user can make a price check (rate limiting)
  static async canMakePriceCheck(
    telegramId: string | number
  ): Promise<{ allowed: boolean; remaining: number; resetTime?: string }> {
    try {
      const user = await this.getUser(telegramId);
      if (!user) return { allowed: false, remaining: 0 };

      const now = new Date();
      const lastCheck = new Date(user.usage?.last_price_check || 0);
      const minuteAgo = new Date(now.getTime() - 60 * 1000);

      // Reset counter if more than a minute has passed
      if (lastCheck < minuteAgo) {
        await this.resetPriceCheckCounter(telegramId);
        return {
          allowed: true,
          remaining:
            (user.limits?.price_checks_per_minute ||
              TIER_LIMITS[user.limits?.tier || DEFAULT_TIER]
                .price_checks_per_minute) - 1,
        };
      }

      const currentCount = user.usage?.price_checks_this_minute || 0;
      const limit =
        user.limits?.price_checks_per_minute ||
        TIER_LIMITS[user.limits?.tier || DEFAULT_TIER].price_checks_per_minute;

      if (currentCount >= limit) {
        const resetTime = new Date(lastCheck.getTime() + 60 * 1000);
        return {
          allowed: false,
          remaining: 0,
          resetTime: resetTime.toISOString(),
        };
      }

      return { allowed: true, remaining: limit - currentCount - 1 };
    } catch (error) {
      console.error("Error in canMakePriceCheck:", error);
      return { allowed: false, remaining: 0 };
    }
  }

  // Increment price check counter
  static async incrementPriceCheck(
    telegramId: string | number
  ): Promise<boolean> {
    try {
      const user = await this.getUser(telegramId);
      if (!user) return false;

      const now = new Date();
      const lastCheck = new Date(user.usage?.last_price_check || 0);
      const minuteAgo = new Date(now.getTime() - 60 * 1000);

      let newCount = 1;
      if (lastCheck >= minuteAgo) {
        newCount = (user.usage?.price_checks_this_minute || 0) + 1;
      }

      const { error } = await supabase
        .from("users")
        .update({
          usage: {
            ...user.usage,
            price_checks_this_minute: newCount,
            last_price_check: now.toISOString(),
          },
        })
        .eq("telegram_id", String(telegramId));

      return !error;
    } catch (error) {
      console.error("Error in incrementPriceCheck:", error);
      return false;
    }
  }

  // Reset price check counter
  static async resetPriceCheckCounter(
    telegramId: string | number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          usage: {
            price_checks_this_minute: 0,
            last_price_check: new Date().toISOString(),
          },
        })
        .eq("telegram_id", String(telegramId));

      return !error;
    } catch (error) {
      console.error("Error in resetPriceCheckCounter:", error);
      return false;
    }
  }

  // Check if user can create more alerts
  static async canCreateAlert(
    telegramId: string | number
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    try {
      const user = await this.getUser(telegramId);
      if (!user) return { allowed: false, current: 0, limit: 0 };

      const currentAlerts = user.usage?.alerts_created || 0;
      const limit =
        user.limits?.max_alerts ||
        TIER_LIMITS[user.limits?.tier || DEFAULT_TIER].max_alerts;

      return {
        allowed: currentAlerts < limit,
        current: currentAlerts,
        limit: limit,
      };
    } catch (error) {
      console.error("Error in canCreateAlert:", error);
      return { allowed: false, current: 0, limit: 0 };
    }
  }

  // Update user preferences
  static async updatePreferences(
    telegramId: number,
    preferences: {
      currency?: string;
      language?: string;
      notifications?: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId);

      if (error) {
        console.error("Error updating preferences:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updatePreferences:", error);
      return false;
    }
  }
}

// CS2 Item management functions
export class ItemService {
  // Search items by query
  static async searchItems(
    query: string,
    limit: number = 20
  ): Promise<CS2Item[]> {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .or(
          `name.ilike.%${query}%,weapon_name.ilike.%${query}%,skin_name.ilike.%${query}%`
        )
        .order("name")
        .limit(limit);

      if (error) {
        console.error("Search error:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error searching items:", error);
      return [];
    }
  }

  // Get items by weapon type
  static async getItemsByType(
    weaponType: string,
    limit: number = 50
  ): Promise<CS2Item[]> {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("weapon_type", weaponType)
        .order("name")
        .limit(limit);

      if (error) {
        console.error("Error getting items by type:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting items by type:", error);
      return [];
    }
  }

  // Get items by rarity
  static async getItemsByRarity(
    rarity: string,
    limit: number = 50
  ): Promise<CS2Item[]> {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("rarity", rarity)
        .order("name")
        .limit(limit);

      if (error) {
        console.error("Error getting items by rarity:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting items by rarity:", error);
      return [];
    }
  }

  // Get item by name
  static async getItemByName(itemName: string): Promise<CS2Item | null> {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("name", itemName)
        .single();

      if (error) {
        console.error("Error getting item by name:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error getting item by name:", error);
      return null;
    }
  }

  // Get item statistics
  static async getItemStatistics(): Promise<{
    totalItems: number;
    byType: Record<string, number>;
    byRarity: Record<string, number>;
  }> {
    try {
      // Get total count
      const { count: totalItems } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true });

      // Get counts by weapon type
      const { data: typeStats } = await supabase
        .from("items")
        .select("weapon_type")
        .order("weapon_type");

      // Get counts by rarity
      const { data: rarityStats } = await supabase
        .from("items")
        .select("rarity")
        .order("rarity");

      const byType: Record<string, number> = {};
      const byRarity: Record<string, number> = {};

      // Initialize all predefined weapon types with 0 count
      WEAPON_TYPES.forEach((weaponType) => {
        byType[weaponType] = 0;
      });

      // Count actual occurrences
      typeStats?.forEach((item) => {
        byType[item.weapon_type] = (byType[item.weapon_type] || 0) + 1;
      });

      rarityStats?.forEach((item) => {
        byRarity[item.rarity] = (byRarity[item.rarity] || 0) + 1;
      });

      return {
        totalItems: totalItems || 0,
        byType,
        byRarity,
      };
    } catch (error) {
      console.error("Error getting item statistics:", error);
      return {
        totalItems: 0,
        byType: {},
        byRarity: {},
      };
    }
  }
}

// Price alert management functions
export class AlertService {
  // Create a new price alert
  static async createAlert(
    userId: string,
    itemName: string,
    targetPrice: number,
    alertType:
      | "absolute"
      | "percentage_drop"
      | "percentage_increase" = "absolute",
    percentageThreshold?: number,
    basePrice?: number
  ): Promise<PriceAlert | null> {
    try {
      // Try to find the item in our database
      const item = await ItemService.getItemByName(itemName);

      const { data: alert, error } = await adminSupabase
        .from("price_alerts")
        .insert({
          user_id: userId,
          item_name: itemName,
          item_id: item?.id || null,
          target_price: targetPrice,
          alert_type: alertType,
          percentage_threshold: percentageThreshold,
          base_price: basePrice,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating alert:", error);
        return null;
      }

      // Increment user's alert count
      const user = await adminSupabase
        .from("users")
        .select("usage")
        .eq("id", userId)
        .single();

      if (user.data) {
        await adminSupabase
          .from("users")
          .update({
            usage: {
              ...user.data.usage,
              alerts_created: (user.data.usage?.alerts_created || 0) + 1,
            },
          })
          .eq("id", userId);
      }

      return alert;
    } catch (error) {
      console.error("Error in createAlert:", error);
      return null;
    }
  }

  // Get user's active alerts
  static async getUserAlerts(userId: string): Promise<PriceAlert[]> {
    try {
      const { data: alerts, error } = await adminSupabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting alerts:", error);
        return [];
      }

      return alerts || [];
    } catch (error) {
      console.error("Error in getUserAlerts:", error);
      return [];
    }
  }

  // Deactivate an alert
  static async deactivateAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await adminSupabase
        .from("price_alerts")
        .update({ is_active: false })
        .eq("id", alertId);

      if (error) {
        console.error("Error deactivating alert:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deactivateAlert:", error);
      return false;
    }
  }
}

// Price cache and history management
export class PriceService {
  // Get cached price or null if expired/not found
  static async getCachedPrice(itemName: string): Promise<PriceCache | null> {
    try {
      const { data: cache, error } = await supabase
        .from("price_cache")
        .select("*")
        .eq("item_name", itemName)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !cache) return null;
      return cache;
    } catch (error) {
      console.error("Error in getCachedPrice:", error);
      return null;
    }
  }

  // Cache a price result
  static async cachePrice(
    itemName: string,
    price: number,
    currency: string,
    success: boolean,
    volume?: number,
    medianPrice?: number
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

      // Try to find the item in our database
      const item = await ItemService.getItemByName(itemName);

      await supabase.from("price_cache").upsert({
        item_name: itemName,
        item_id: item?.id || null,
        price,
        currency,
        volume,
        median_price: medianPrice,
        success,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Also store in historical data
      await supabase.from("price_history").insert({
        item_name: itemName,
        item_id: item?.id || null,
        price,
        currency,
        volume,
        median_price: medianPrice,
        success,
        recorded_at: now.toISOString(),
      });
    } catch (error) {
      console.error("Error in cachePrice:", error);
    }
  }

  // Get price history for an item
  static async getPriceHistory(
    itemName: string,
    days: number = 7
  ): Promise<PriceHistory[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data: history, error } = await supabase
        .from("price_history")
        .select("*")
        .eq("item_name", itemName)
        .gte("recorded_at", cutoffDate.toISOString())
        .order("recorded_at", { ascending: false });

      if (error) {
        console.error("Error getting price history:", error);
        return [];
      }

      return history || [];
    } catch (error) {
      console.error("Error in getPriceHistory:", error);
      return [];
    }
  }

  // Clean up expired cache entries
  static async cleanupExpiredCache(): Promise<void> {
    try {
      await supabase
        .from("price_cache")
        .delete()
        .lt("expires_at", new Date().toISOString());
    } catch (error) {
      console.error("Error in cleanupExpiredCache:", error);
    }
  }
}
