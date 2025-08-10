import { config } from "dotenv";
import { adminSupabase } from "./database";

// Load environment variables
config();

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

// Search session interface
export interface SearchSession {
  userId: string;
  step:
    | "weapon_type"
    | "weapon_name"
    | "skin_name"
    | "condition"
    | "category"
    | "complete";
  weaponType?: string;
  weaponName?: string;
  skinName?: string;
  condition?: SkinCondition;
  category?: string;
  finalName?: string;
  timestamp: number;
}

// In-memory storage for search sessions (in production, use Redis or database)
const searchSessions = new Map<string, SearchSession>();

export class SearchService {
  /**
   * Get all weapon types from the database
   */
  static async getWeaponTypes(): Promise<string[]> {
    try {
      const { data, error } = await adminSupabase
        .from("items")
        .select("weapon_type")
        .order("weapon_type");

      if (error) {
        console.error("Error getting weapon types:", error);
        return [];
      }

      // Get unique weapon types
      const uniqueTypes = [
        ...new Set(data?.map((item) => item.weapon_type) || []),
      ];
      return uniqueTypes.sort();
    } catch (error) {
      console.error("Error in getWeaponTypes:", error);
      return [];
    }
  }

  /**
   * Get weapon names by weapon type
   */
  static async getWeaponNames(weaponType: string): Promise<string[]> {
    try {
      const { data, error } = await adminSupabase
        .from("items")
        .select("weapon_name")
        .eq("weapon_type", weaponType)
        .order("weapon_name");

      if (error) {
        console.error("Error getting weapon names:", error);
        return [];
      }

      // Get unique weapon names
      const uniqueNames = [
        ...new Set(data?.map((item) => item.weapon_name) || []),
      ];
      return uniqueNames.sort();
    } catch (error) {
      console.error("Error in getWeaponNames:", error);
      return [];
    }
  }

  /**
   * Get skin names by weapon name
   */
  static async getSkinNames(weaponName: string): Promise<string[]> {
    try {
      const { data, error } = await adminSupabase
        .from("items")
        .select("skin_name, weapon_type")
        .eq("weapon_name", weaponName)
        .not("skin_name", "is", null)
        .order("skin_name");

      if (error) {
        console.error("Error getting skin names:", error);
        return [];
      }

      // Get unique skin names and filter out null/empty values
      const uniqueSkins = [
        ...new Set(
          data
            ?.map((item) => item.skin_name)
            .filter((skin) => skin && skin.trim()) || []
        ),
      ];

      // For knives, add "Vanilla" option if there are other skins available
      // This represents knives without any skin
      const isKnife = data?.some(
        (item) => item.weapon_type?.toLowerCase() === "knife"
      );
      if (isKnife && uniqueSkins.length > 0) {
        uniqueSkins.unshift("Vanilla");
      }

      return uniqueSkins.sort();
    } catch (error) {
      console.error("Error getting skin names:", error);
      return [];
    }
  }

  /**
   * Get available categories based on weapon type
   */
  static getAvailableCategories(weaponType: string): string[] {
    switch (weaponType.toLowerCase()) {
      case "knife":
        return [...ITEM_CATEGORIES.KNIFE];
      case "gloves":
        return [...ITEM_CATEGORIES.GLOVES];
      default:
        return [...ITEM_CATEGORIES.WEAPON];
    }
  }

  /**
   * Generate final item name based on selections
   */
  static generateItemName(
    weaponType: string,
    weaponName: string,
    skinName: string | null,
    condition: SkinCondition,
    category: string
  ): string {
    const isKnife = weaponType.toLowerCase() === "knife";
    const isGloves = weaponType.toLowerCase() === "gloves";
    const hasSkin =
      skinName && skinName.trim() && skinName.toLowerCase() !== "vanilla";

    // Handle knives
    if (isKnife) {
      if (!hasSkin) {
        // Knife without skin (vanilla)
        if (category === "★ StatTrak™") {
          return `★ StatTrak™ ${weaponName}`;
        } else {
          return `★ ${weaponName}`;
        }
      } else {
        // Knife with skin
        if (category === "★ StatTrak™") {
          return `★ StatTrak™ ${weaponName} | ${skinName} (${condition})`;
        } else {
          return `★ ${weaponName} | ${skinName} (${condition})`;
        }
      }
    }

    // Handle gloves
    if (isGloves) {
      return `★ ${weaponName} | ${skinName} (${condition})`;
    }

    // Handle weapons (always have skin names)
    let prefix = "";
    switch (category) {
      case "StatTrak™":
        prefix = "StatTrak™ ";
        break;
      case "Souvenir":
        prefix = "Souvenir ";
        break;
      default:
        prefix = "";
    }

    // Weapons should always have skin names, so we can safely use skinName
    return `${prefix}${weaponName} | ${skinName} (${condition})`;
  }

  /**
   * Create or update search session
   */
  static createSearchSession(userId: string): SearchSession {
    const session: SearchSession = {
      userId,
      step: "weapon_type",
      timestamp: Date.now(),
    };
    searchSessions.set(userId, session);
    return session;
  }

  /**
   * Get search session for user
   */
  static getSearchSession(userId: string): SearchSession | null {
    const session = searchSessions.get(userId);
    if (!session) return null;

    // Check if session is expired (30 minutes)
    if (Date.now() - session.timestamp > 30 * 60 * 1000) {
      searchSessions.delete(userId);
      return null;
    }

    return session;
  }

  /**
   * Update search session
   */
  static updateSearchSession(
    userId: string,
    updates: Partial<SearchSession>
  ): SearchSession | null {
    const session = searchSessions.get(userId);
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      timestamp: Date.now(),
    };
    searchSessions.set(userId, updatedSession);
    return updatedSession;
  }

  /**
   * Clear search session
   */
  static clearSearchSession(userId: string): void {
    searchSessions.delete(userId);
  }

  /**
   * Search for items by full name
   */
  static async searchByFullName(query: string): Promise<any[]> {
    try {
      const { data, error } = await adminSupabase
        .from("items")
        .select("*")
        .or(
          `name.ilike.%${query}%,weapon_name.ilike.%${query}%,skin_name.ilike.%${query}%`
        )
        .order("name")
        .limit(10);

      if (error) {
        console.error("Search error:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in searchByFullName:", error);
      return [];
    }
  }

  /**
   * Validate if generated item name exists in database
   */
  static async validateItemName(itemName: string): Promise<boolean> {
    try {
      const { data, error } = await adminSupabase
        .from("items")
        .select("name")
        .eq("name", itemName)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get similar item names for suggestions
   */
  static async getSimilarItems(itemName: string): Promise<string[]> {
    try {
      const { data, error } = await adminSupabase
        .from("items")
        .select("name")
        .or(`name.ilike.%${itemName}%,weapon_name.ilike.%${itemName}%`)
        .order("name")
        .limit(5);

      if (error) {
        console.error("Error getting similar items:", error);
        return [];
      }

      return data?.map((item) => item.name) || [];
    } catch (error) {
      console.error("Error in getSimilarItems:", error);
      return [];
    }
  }
}
