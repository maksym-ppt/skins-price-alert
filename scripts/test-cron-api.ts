import { config } from "dotenv";
import fetch from "node-fetch";

// Load environment variables
config();

async function testCronAPI() {
  try {
    console.log("🧪 Testing Cron API Endpoint...\n");

    // Check required environment variables
    if (!process.env.CRON_SECRET) {
      console.log("❌ CRON_SECRET not configured");
      console.log("💡 Add CRON_SECRET=your-secret-here to your .env file");
      return;
    }

    // Get the API URL (assuming it's deployed on Vercel)
    const apiUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/cron`
      : "http://localhost:3000/api/cron";

    console.log(`🌐 API URL: ${apiUrl}`);

    // Make the request with proper authentication
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📡 Response Status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Cron job executed successfully!");
      console.log("📊 Results:", JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log("❌ Cron job failed:");
      console.log("Error:", error);
    }
  } catch (error) {
    console.error("❌ Error testing cron API:", error);
  }
}

// Run the test
testCronAPI();
