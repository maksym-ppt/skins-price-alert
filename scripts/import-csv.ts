#!/usr/bin/env tsx

import { CSVImporter } from "../src/csv-importer";

async function main() {
  console.log("🚀 Starting CS2 Items CSV Import...\n");

  try {
    const startTime = Date.now();

    const result = await CSVImporter.importAllCSVFiles();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n📊 Final Results:");
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📦 Total Processed: ${result.totalProcessed}`);
    console.log(`✅ Successfully Imported: ${result.totalImported}`);
    console.log(`❌ Errors: ${result.totalErrors}`);
    console.log(`🔄 Duplicates: ${result.totalDuplicates}`);

    console.log("\n📁 File Details:");
    Object.entries(result.fileResults).forEach(([filename, stats]) => {
      console.log(`  ${filename}:`);
      console.log(`    - Processed: ${stats.processed}`);
      console.log(`    - Imported: ${stats.imported}`);
      console.log(`    - Errors: ${stats.errors}`);
      console.log(`    - Duplicates: ${stats.duplicates}`);
      if (stats.error) {
        console.log(`    - Error: ${stats.error}`);
      }
    });

    if (result.totalErrors === 0) {
      console.log("\n🎉 Import completed successfully!");
    } else {
      console.log(
        "\n⚠️  Import completed with some errors. Check the logs above."
      );
    }

    // Get and display statistics
    console.log("\n📈 Database Statistics:");
    const stats = await CSVImporter.getItemStatistics();
    console.log(`Total Items in Database: ${stats.totalItems}`);

    console.log("\nBy Weapon Type:");
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log("\nBy Rarity:");
    Object.entries(stats.byRarity).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });
  } catch (error) {
    console.error("\n💥 Fatal error during import:", error);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);
