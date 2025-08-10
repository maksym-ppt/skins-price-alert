#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables
config();

console.log("🔍 Checking environment variables...\n");

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

let allPresent = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT FOUND`);
    allPresent = false;
  }
});

console.log("\n" + "=".repeat(50));

if (allPresent) {
  console.log("🎉 All required environment variables are present!");
  console.log("You can now run: npm run import-csv");
} else {
  console.log("⚠️  Missing required environment variables!");
  console.log("Please create a .env file with the required variables.");
  console.log("See env.example for reference.");
}

console.log("\nEnvironment check complete.");
