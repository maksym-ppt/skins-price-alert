import { Telegraf } from "telegraf";
import { AlertService, PriceService, supabase } from "../src/database";
import { getSteamPrice } from "../src/steam";

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Cron job handler for checking price alerts
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify cron secret using Authorization: Bearer <CRON_SECRET>
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: "CRON_SECRET not configured" });
  }
  const authHeader = req.headers["authorization"] as string | undefined;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("🕐 Starting cron job...");

    // 1. Clean up expired cache
    await PriceService.cleanupExpiredCache();
    console.log("✅ Cleaned up expired cache");

    // 2. Get all active alerts
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
      console.error("Error fetching alerts:", error);
      return res.status(500).json({ error: "Database error" });
    }

    console.log(`📊 Found ${alerts?.length || 0} active alerts`);

    // 3. Check each alert
    let triggeredAlerts = 0;
    let errors = 0;

    for (const alert of alerts || []) {
      try {
        // Get current price
        const priceResult = await getSteamPrice(alert.item_name);

        if (priceResult.success && priceResult.price) {
          const currentPrice = priceResult.price;
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
              if (increasePercentage >= alert.percentage_threshold) {
                shouldTrigger = true;
                triggerReason = `Price increased ${increasePercentage.toFixed(
                  1
                )}% (threshold: ${alert.percentage_threshold}%)`;
              }
            }
          }

          if (shouldTrigger) {
            // Send notification
            await bot.telegram.sendMessage(
              alert.users.telegram_id,
              `🔔 Price Alert Triggered!\n\n` +
                `Item: ${alert.item_name}\n` +
                `Current Price: $${currentPrice}\n` +
                `Alert Reason: ${triggerReason}\n\n` +
                `The price has reached your target! 🎉`
            );

            // Deactivate the alert
            await AlertService.deactivateAlert(alert.id);
            triggeredAlerts++;
          } else {
            // Update current price in alert
            await supabase
              .from("price_alerts")
              .update({ current_price: currentPrice })
              .eq("id", alert.id);
          }
        }
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        errors++;
      } finally {
        // Throttle: wait 1 second after each alert to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Processed ${alerts?.length || 0} alerts`);
    console.log(`🔔 Triggered ${triggeredAlerts} alerts`);
    console.log(`❌ Errors: ${errors}`);

    return res.status(200).json({
      success: true,
      processed: alerts?.length || 0,
      triggered: triggeredAlerts,
      errors,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
