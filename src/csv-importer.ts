import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { adminSupabase } from "./database";

// Load environment variables from .env file
config();

// Interface for CSV row data
interface CSVItem {
  Name: string;
  "Weapon Name": string;
  "Weapon Type": string;
  "Skin Name": string;
  Rarity: string;
  Definition: string;
  Colour: string;
  Collection: string;
  Introduced: string;
}

// Interface for processed item data
interface ProcessedItem {
  name: string;
  weapon_name: string;
  weapon_type: string;
  skin_name: string | null;
  rarity: string;
  rarity_definition: string | null;
  rarity_color: string | null;
  collection: string | null;
  introduced_date: string | null;
}

export class CSVImporter {
  private static readonly CSV_FILES = [
    "CS2 Skins Database -  Knives.csv",
    "CS2 Skins Database - Gloves.csv",
    "CS2 Skins Database - Weapons.csv",
  ];

  /**
   * Parse date string to ISO format
   */
  private static parseDate(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === "") return null;

    try {
      // Handle various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
    } catch {
      return null;
    }
  }

  /**
   * Clean and validate item data
   */
  private static processItem(csvItem: CSVItem): ProcessedItem | null {
    try {
      // Basic validation
      if (!csvItem.Name || !csvItem["Weapon Name"] || !csvItem["Weapon Type"]) {
        console.warn(
          "Skipping item with missing required fields:",
          csvItem.Name
        );
        return null;
      }

      return {
        name: csvItem.Name.trim(),
        weapon_name: csvItem["Weapon Name"].trim(),
        weapon_type: csvItem["Weapon Type"].trim(),
        skin_name: csvItem["Skin Name"]?.trim() || null,
        rarity: csvItem.Rarity?.trim() || "Unknown",
        rarity_definition: csvItem.Definition?.trim() || null,
        rarity_color: csvItem.Colour?.trim() || null,
        collection: csvItem.Collection?.trim() || null,
        introduced_date: this.parseDate(csvItem.Introduced),
      };
    } catch (error) {
      console.error("Error processing item:", csvItem.Name, error);
      return null;
    }
  }

  /**
   * Read and parse CSV file
   */
  private static async readCSVFile(filename: string): Promise<ProcessedItem[]> {
    try {
      const filePath = join(process.cwd(), "data", filename);
      const fileContent = readFileSync(filePath, "utf-8");

      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CSVItem[];

      const processedItems: ProcessedItem[] = [];

      for (const record of records) {
        const processed = this.processItem(record);
        if (processed) {
          processedItems.push(processed);
        }
      }

      console.log(`Processed ${processedItems.length} items from ${filename}`);
      return processedItems;
    } catch (error) {
      console.error(`Error reading CSV file ${filename}:`, error);
      return [];
    }
  }

  /**
   * Import items to database
   */
  private static async importItemsToDatabase(items: ProcessedItem[]): Promise<{
    success: number;
    errors: number;
    duplicates: number;
  }> {
    let success = 0;
    let errors = 0;
    let duplicates = 0;

    // Process items in batches to avoid overwhelming the database
    const batchSize = 100;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        const { data, error } = await adminSupabase
          .from("items")
          .upsert(batch, {
            onConflict: "name",
            ignoreDuplicates: false,
          })
          .select();

        if (error) {
          console.error("Database error for batch:", error);
          errors += batch.length;
        } else {
          success += data?.length || 0;
          duplicates += batch.length - (data?.length || 0);
        }
      } catch (error) {
        console.error("Error importing batch:", error);
        errors += batch.length;
      }

      // Add a small delay between batches to be respectful to the database
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { success, errors, duplicates };
  }

  /**
   * Main import function
   */
  static async importAllCSVFiles(): Promise<{
    totalProcessed: number;
    totalImported: number;
    totalErrors: number;
    totalDuplicates: number;
    fileResults: Record<string, any>;
  }> {
    console.log("Starting CSV import process...");

    let totalProcessed = 0;
    let totalImported = 0;
    let totalErrors = 0;
    let totalDuplicates = 0;
    const fileResults: Record<string, any> = {};

    for (const filename of this.CSV_FILES) {
      console.log(`\nProcessing ${filename}...`);

      try {
        const items = await this.readCSVFile(filename);
        totalProcessed += items.length;

        if (items.length > 0) {
          const result = await this.importItemsToDatabase(items);

          fileResults[filename] = {
            processed: items.length,
            imported: result.success,
            errors: result.errors,
            duplicates: result.duplicates,
          };

          totalImported += result.success;
          totalErrors += result.errors;
          totalDuplicates += result.duplicates;

          console.log(
            `✓ ${filename}: ${result.success} imported, ${result.errors} errors, ${result.duplicates} duplicates`
          );
        } else {
          fileResults[filename] = {
            processed: 0,
            imported: 0,
            errors: 0,
            duplicates: 0,
          };
          console.log(`⚠ ${filename}: No items processed`);
        }
      } catch (error) {
        console.error(`✗ Error processing ${filename}:`, error);
        fileResults[filename] = {
          processed: 0,
          imported: 0,
          errors: 1,
          duplicates: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        totalErrors++;
      }
    }

    const summary = {
      totalProcessed,
      totalImported,
      totalErrors,
      totalDuplicates,
      fileResults,
    };

    console.log("\n=== Import Summary ===");
    console.log(`Total items processed: ${totalProcessed}`);
    console.log(`Total items imported: ${totalImported}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total duplicates: ${totalDuplicates}`);
    console.log("=====================\n");

    return summary;
  }

  /**
   * Search items by query
   */
  static async searchItems(query: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await adminSupabase
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

  /**
   * Get items by weapon type
   */
  static async getItemsByType(
    weaponType: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await adminSupabase
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

  /**
   * Get items by rarity
   */
  static async getItemsByRarity(
    rarity: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await adminSupabase
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

  /**
   * Get item statistics
   */
  static async getItemStatistics(): Promise<{
    totalItems: number;
    byType: Record<string, number>;
    byRarity: Record<string, number>;
  }> {
    try {
      // Get total count
      const { count: totalItems } = await adminSupabase
        .from("items")
        .select("*", { count: "exact", head: true });

      // Get counts by weapon type
      const { data: typeStats } = await adminSupabase
        .from("items")
        .select("weapon_type")
        .order("weapon_type");

      // Get counts by rarity
      const { data: rarityStats } = await adminSupabase
        .from("items")
        .select("rarity")
        .order("rarity");

      const byType: Record<string, number> = {};
      const byRarity: Record<string, number> = {};

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
