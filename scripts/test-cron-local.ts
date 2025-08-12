import { config } from "dotenv";
import { Telegraf } from "telegraf";
import { AlertService, PriceService, supabase } from "../src/database";
import { getSteamPrice } from "../src/steam";

// Load environment variables
config();

const bot = new Telegraf(process.env.BOT_TOKEN!);

async function testCronLocal() {
  try {
    console.log("🧪 Testing Cron Job Locally (with notifications)...\n");

    // Check required environment variables
    if (!process.env.BOT_TOKEN) {
      console.log("❌ BOT_TOKEN not configured");
      return;
    }

    console.log("✅ Environment variables loaded");

    // 1. Clean up expired cache
    console.log("\n🔄 Step 1: Cleaning up expired cache...");
    await PriceService.cleanupExpiredCache();
    console.log("✅ Cleaned up expired cache");

    // 2. Get all active alerts
    console.log("\n🔄 Step 2: Fetching active alerts...");
    const { data: alerts, error } = await supabase
      .from("price_alerts")
      .select(
        `
        *,
        users!inner(telegram_id)
      `
      )
      .eq("is_active", true);

    if (error) {
      console.error("❌ Error fetching alerts:", error);
      return;
    }

    console.log(`📊 Found ${alerts?.length || 0} active alerts`);

    if (alerts && alerts.length > 0) {
      console.log("\n📋 Active Alerts:");
      alerts.forEach((alert, index) => {
        console.log(
          `   ${index + 1}. ${alert.item_name} - Target: $${
            alert.target_price
          } (${alert.alert_type})`
        );
      });
    }

    // 3. Check each alert
    console.log("\n🔄 Step 3: Processing alerts...");
    let triggeredAlerts = 0;
    let errors = 0;

    for (const alert of alerts || []) {
      try {
        console.log(`\n🔍 Processing: ${alert.item_name}`);

        // Get current price
        const priceResult = await getSteamPrice(alert.item_name);

        if (priceResult.success && priceResult.price) {
          const currentPrice = priceResult.price;
          console.log(`   Current price: $${currentPrice}`);
          console.log(`   Target price: $${alert.target_price}`);

          let shouldTrigger = false;
          let triggerReason = "";

          // Check different alert types
          if (alert.alert_type === "absolute") {
            // Absolute price alert
            if (currentPrice <= alert.target_price) {
              shouldTrigger = true;
              triggerReason = `Price dropped to $${currentPrice} (target: $${alert.target_price})`;
            }
          } else if (alert.alert_type === "percentage_drop") {
            // Percentage drop alert
            if (alert.base_price && alert.percentage_threshold) {
              const dropPercentage =
                ((alert.base_price - currentPrice) / alert.base_price) * 100;
              console.log(`   Base price: $${alert.base_price}`);
              console.log(
                `   Drop percentage: ${dropPercentage.toFixed(
                  1
                )}% (threshold: ${alert.percentage_threshold}%)`
              );

              if (dropPercentage >= alert.percentage_threshold) {
                shouldTrigger = true;
                triggerReason = `Price dropped ${dropPercentage.toFixed(
                  1
                )}% (threshold: ${alert.percentage_threshold}%)`;
              }
            }
          } else if (alert.alert_type === "percentage_increase") {
            // Percentage increase alert
            if (alert.base_price && alert.percentage_threshold) {
              const increasePercentage =
                ((currentPrice - alert.base_price) / alert.base_price) * 100;
              console.log(`   Base price: $${alert.base_price}`);
              console.log(
                `   Increase percentage: ${increasePercentage.toFixed(
                  1
                )}% (threshold: ${alert.percentage_threshold}%)`
              );

              if (increasePercentage >= alert.percentage_threshold) {
                shouldTrigger = true;
                triggerReason = `Price increased ${increasePercentage.toFixed(
                  1
                )}% (threshold: ${alert.percentage_threshold}%)`;
              }
            }
          }

          if (shouldTrigger) {
            console.log(`   🎉 ALERT TRIGGERED: ${triggerReason}`);

            // Send notification
            try {
              await bot.telegram.sendMessage(
                alert.users.telegram_id,
                `🔔 Price Alert Triggered!\n\n` +
                  `Item: ${alert.item_name}\n` +
                  `Current Price: $${currentPrice}\n` +
                  `Alert Reason: ${triggerReason}\n\n` +
                  `The price has reached your target! 🎉`
              );
              console.log(
                `   📱 Notification sent to user ${alert.users.telegram_id}`
              );
            } catch (notifyError) {
              console.error(`   ❌ Failed to send notification:`, notifyError);
            }

            // Deactivate the alert
            await AlertService.deactivateAlert(alert.id);
            console.log(`   🗑️  Alert deactivated: ${alert.id}`);

            triggeredAlerts++;
          } else {
            console.log(`   ✅ No trigger - updating current price`);

            // Update current price in alert
            await supabase
              .from("price_alerts")
              .update({ current_price: currentPrice })
              .eq("id", alert.id);
          }
        } else {
          console.log(`   ❌ Failed to get price for ${alert.item_name}`);
          errors++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing alert ${alert.id}:`, error);
        errors++;
      } finally {
        // Throttle: wait 1 second after each alert to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n📊 Cron Job Results:`);
    console.log(`   Processed: ${alerts?.length || 0} alerts`);
    console.log(`   Triggered: ${triggeredAlerts} alerts`);
    console.log(`   Errors: ${errors}`);

    console.log("\n✅ Cron job test completed!");
  } catch (error) {
    console.error("❌ Error testing cron job:", error);
  }
}

// Run the test
testCronLocal();
