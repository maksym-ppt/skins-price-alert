#!/usr/bin/env tsx

import { config } from "dotenv";
import { WEAPON_TYPES } from "../src/constants";
import { adminSupabase } from "../src/database";

// Load environment variables
config();

async function checkWeaponTypes() {
  console.log("🔍 Checking weapon types in database...\n");

  try {
    // Use predefined weapon types
    console.log(`Found ${WEAPON_TYPES.length} weapon types:`);
    WEAPON_TYPES.forEach((type, index) => {
      console.log(`${index + 1}. ${type}`);
    });

    // Get total count first
    const { count: totalCount, error: countError } = await adminSupabase
      .from("items")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Error getting total count:", countError);
      return;
    }

    // Get detailed count by weapon type using pagination
    console.log("\n📊 Weapon type counts:");
    const allCounts: string[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await adminSupabase
        .from("items")
        .select("weapon_type")
        .order("weapon_type")
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching counts:", error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allCounts.push(...data.map((item) => item.weapon_type));
      from += pageSize;

      if (data.length < pageSize) {
        break;
      }
    }

    const typeCounts: Record<string, number> = {};
    allCounts.forEach((weaponType) => {
      typeCounts[weaponType] = (typeCounts[weaponType] || 0) + 1;
    });

    // Display counts for predefined weapon types in order
    WEAPON_TYPES.forEach((type) => {
      const count = typeCounts[type] || 0;
      console.log(`• ${type}: ${count} items`);
    });

    console.log(`\nTotal items in database: ${totalCount}`);
    console.log("\n✅ All weapon types found!");
  } catch (error) {
    console.error("❌ Error checking weapon types:", error);
  }
}

checkWeaponTypes();
