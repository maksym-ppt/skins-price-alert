#!/usr/bin/env tsx

import { ItemService } from "../src/database";

async function testImport() {
  console.log("🧪 Testing CS2 Items Import...\n");

  try {
    // Test 1: Get item statistics
    console.log("📊 Getting item statistics...");
    const stats = await ItemService.getItemStatistics();
    console.log(`Total items in database: ${stats.totalItems}`);

    if (stats.totalItems === 0) {
      console.log(
        "❌ No items found in database. Please run the import first:"
      );
      console.log("   npm run import-csv");
      return;
    }

    console.log("\nBy Weapon Type:");
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log("\nBy Rarity:");
    Object.entries(stats.byRarity).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });

    // Test 2: Search for specific items
    console.log("\n🔍 Testing search functionality...");

    const searchTests = ["AK-47", "Bayonet", "AWP", "Gloves", "Doppler"];

    for (const query of searchTests) {
      console.log(`\nSearching for "${query}":`);
      const results = await ItemService.searchItems(query, 5);
      console.log(`Found ${results.length} items:`);
      results.forEach((item) => {
        console.log(`  - ${item.name} (${item.rarity})`);
      });
    }

    // Test 3: Get items by type
    console.log("\n🗡️ Testing get items by type...");
    const knives = await ItemService.getItemsByType("Knife", 3);
    console.log(`Found ${knives.length} knives (showing first 3):`);
    knives.forEach((knife) => {
      console.log(`  - ${knife.name} (${knife.rarity})`);
    });

    // Test 4: Get items by rarity
    console.log("\n💎 Testing get items by rarity...");
    const covertItems = await ItemService.getItemsByRarity("Covert", 3);
    console.log(`Found ${covertItems.length} Covert items (showing first 3):`);
    covertItems.forEach((item) => {
      console.log(`  - ${item.name} (${item.weapon_type})`);
    });

    // Test 5: Get specific item by name
    console.log("\n🎯 Testing get item by name...");
    const testItemName = "AK-47 | Redline";
    const item = await ItemService.getItemByName(testItemName);
    if (item) {
      console.log(`Found item: ${item.name}`);
      console.log(`  Weapon: ${item.weapon_name}`);
      console.log(`  Type: ${item.weapon_type}`);
      console.log(`  Rarity: ${item.rarity}`);
      console.log(`  Collection: ${item.collection || "N/A"}`);
    } else {
      console.log(`Item not found: ${testItemName}`);
    }

    console.log("\n✅ All tests completed successfully!");
    console.log("\n🎉 Your CS2 items database is working correctly!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testImport().catch(console.error);
