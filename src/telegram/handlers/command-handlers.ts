import { Context, Markup } from "telegraf";
import { DEFAULT_TIER, TIER_DISPLAY_NAMES, TIER_LIMITS } from "../../constants";
import { AlertService, UserService } from "../../database";
import { SearchService } from "../../search-service";
import { getAvailableCurrencies, getAvailableGames } from "../../steam";
import { KeyboardUtils } from "../utils/keyboard-utils";

export class CommandHandlers {
  static async handleStart(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    // Auto-register user
    const registeredUser = await UserService.registerUser(user.id, {
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    if (registeredUser) {
      const tier = registeredUser.limits?.tier || DEFAULT_TIER;
      const limits = registeredUser.limits || {
        max_alerts: TIER_LIMITS[tier].max_alerts,
        price_checks_per_minute: TIER_LIMITS[tier].price_checks_per_minute,
        tier,
      };

      await ctx.reply(
        `🎮 Welcome to Steam Skins Price Alert Bot!\n\n` +
          `I can help you track prices from multiple Steam games.\n\n` +
          `📋 Available commands:\n` +
          `• Send any item name to check its price\n` +
          `• /search - Step-by-step item search\n` +
          `• /restart - Restart current search session\n` +
          `• /games - List supported games\n` +
          `• /currency - Set your preferred currency\n` +
          `• /alerts - Manage your price alerts\n` +
          `• /profile - View your profile\n` +
          `• /help - Show this help message\n\n` +
          `📊 Your Limits (${limits.tier} tier):\n` +
          `• Price checks: ${limits.price_checks_per_minute}/minute\n` +
          `• Max alerts: ${limits.max_alerts}\n\n` +
          `💡 Alert Types:\n` +
          `• Absolute: "50" (alert at $50)\n` +
          `• Percentage drop: "-10%" (alert when price drops 10%)\n` +
          `• Percentage increase: "+20%" (alert when price increases 20%)\n\n` +
          `Try sending: "AK-47 | Redline (Field-Tested)" or use /search`
      );
    } else {
      await ctx.reply(
        "❌ Sorry, there was an error registering your account. Please try again later."
      );
    }
  }

  static async handleHelp(ctx: Context) {
    await ctx.reply(
      `🎮 Steam Skins Price Alert Bot Help\n\n` +
        `📋 Commands:\n` +
        `• /start - Welcome message and registration\n` +
        `• /search - Step-by-step item search\n` +
        `• /restart - Restart current search session\n` +
        `• /games - List supported games\n` +
        `• /currency - Set your preferred currency\n` +
        `• /alerts - Manage your price alerts\n` +
        `• /profile - View your profile\n` +
        `• /help - Show this help message\n\n` +
        `💡 Usage:\n` +
        `• Send any item name to check its current price\n` +
        `• Use /search for guided item selection\n` +
        `• Use exact item names like "AK-47 | Redline (Field-Tested)"\n` +
        `• Default game: Counter-Strike 2\n` +
        `• Default currency: USD\n\n` +
        `🔔 Price Alerts:\n` +
        `• Set alerts to get notified when prices change\n` +
        `• Manage your alerts with /alerts command\n\n` +
        `📊 Alert Types:\n` +
        `• Absolute: Reply with "50" for $50 target\n` +
        `• Percentage drop: Reply with "-10%" for 10% drop alert\n` +
        `• Percentage increase: Reply with "+20%" for 20% increase alert\n\n` +
        `⚡ Rate Limits:\n` +
        `• ${TIER_DISPLAY_NAMES.free} tier: ${TIER_LIMITS.free.price_checks_per_minute} price checks/minute, ${TIER_LIMITS.free.max_alerts} max alerts\n` +
        `• ${TIER_DISPLAY_NAMES.premium} tier: ${TIER_LIMITS.premium.price_checks_per_minute} price checks/minute, ${TIER_LIMITS.premium.max_alerts} max alerts\n` +
        `• ${TIER_DISPLAY_NAMES.pro} tier: ${TIER_LIMITS.pro.price_checks_per_minute} price checks/minute, ${TIER_LIMITS.pro.max_alerts} max alerts`
    );
  }

  static async handleGames(ctx: Context) {
    const games = getAvailableGames();
    let message = `🎮 Supported Games:\n\n`;

    Object.entries(games).forEach(([name, id]) => {
      message += `• ${name} (ID: ${id})\n`;
    });

    message += `\n💡 Default game is Counter-Strike 2.`;

    await ctx.reply(message);
  }

  static async handleCurrency(ctx: Context) {
    const currencies = getAvailableCurrencies();
    let message = `💰 Available Currencies:\n\n`;

    // Show first 10 currencies
    const first10 = Object.entries(currencies).slice(0, 10);
    first10.forEach(([name, id]) => {
      message += `• ${name} (ID: ${id})\n`;
    });

    message += `\n... and ${
      Object.keys(currencies).length - 10
    } more currencies.\n\n`;
    message += `💡 Default currency is USD.\n`;
    message += `To set currency, reply with: "currency USD"`;

    await ctx.reply(message);
  }

  static async handleProfile(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    const dbUser = await UserService.getUser(user.id);
    if (!dbUser) {
      await ctx.reply("❌ User not found. Please use /start to register.");
      return;
    }

    const preferences = dbUser.preferences || {
      currency: "USD",
      language: "en",
      notifications: true,
    };
    const limits = dbUser.limits || {
      max_alerts: 5,
      price_checks_per_minute: 10,
      tier: "free",
    };
    const usage = dbUser.usage || {
      alerts_created: 0,
      price_checks_this_minute: 0,
    };

    await ctx.reply(
      `👤 Your Profile\n\n` +
        `🆔 Telegram ID: ${user.id}\n` +
        `👤 Name: ${user.first_name} ${user.last_name || ""}\n` +
        `📅 Registered: ${new Date(
          dbUser.created_at
        ).toLocaleDateString()}\n\n` +
        `⚙️ Preferences:\n` +
        `• Currency: ${preferences.currency}\n` +
        `• Language: ${preferences.language}\n` +
        `• Notifications: ${
          preferences.notifications ? "✅ On" : "❌ Off"
        }\n\n` +
        `📊 Usage (${limits.tier} tier):\n` +
        `• Price checks: ${usage.price_checks_this_minute}/${limits.price_checks_per_minute}/minute\n` +
        `• Alerts: ${usage.alerts_created}/${limits.max_alerts}`
    );
  }

  static async handleAlerts(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    const dbUser = await UserService.getUser(user.id);
    if (!dbUser) {
      await ctx.reply("❌ User not found. Please use /start to register.");
      return;
    }

    const alerts = await AlertService.getUserAlerts(dbUser.id);
    const limits = dbUser.limits || { max_alerts: 5 };

    if (alerts.length === 0) {
      await ctx.reply(
        `🔔 You don't have any active price alerts.\n\n` +
          `To create an alert:\n` +
          `1. Send an item name to check its price\n` +
          `2. Reply with the target price or percentage\n\n` +
          `Examples:\n` +
          `• "50" - Alert at $50\n` +
          `• "-10%" - Alert when price drops 10%\n` +
          `• "+20%" - Alert when price increases 20%\n\n` +
          `📊 Alert limit: ${alerts.length}/${limits.max_alerts}`
      );
    } else {
      let message = `🔔 Your Active Price Alerts:\n\n`;
      alerts.forEach((alert: any, index: number) => {
        message += `${index + 1}. ${alert.item_name}\n`;

        if (alert.alert_type === "absolute") {
          message += `   Type: Absolute price\n`;
          message += `   Target: $${alert.target_price}\n`;
        } else if (alert.alert_type === "percentage_drop") {
          message += `   Type: Percentage drop\n`;
          message += `   Threshold: -${alert.percentage_threshold}%\n`;
          message += `   Base price: $${alert.base_price}\n`;
        } else if (alert.alert_type === "percentage_increase") {
          message += `   Type: Percentage increase\n`;
          message += `   Threshold: +${alert.percentage_threshold}%\n`;
          message += `   Base price: $${alert.base_price}\n`;
        }

        message += `   Current: ${
          alert.current_price ? `$${alert.current_price}` : "Checking..."
        }\n\n`;
      });
      message += `📊 Alert limit: ${alerts.length}/${limits.max_alerts}\n`;
      message += `To remove an alert, reply with "remove [number]"`;

      await ctx.reply(message);
    }
  }

  static async handleSearch(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    // Clear any existing search session
    SearchService.clearSearchSession(user.id.toString());

    // Get weapon types
    const weaponTypes = await SearchService.getWeaponTypes();

    if (weaponTypes.length === 0) {
      await ctx.reply(
        "❌ No weapon types found. Please import items first using /import-csv"
      );
      return;
    }

    // Create search session
    SearchService.createSearchSession(user.id.toString());

    // Create inline keyboard for weapon types using utility
    const keyboard = KeyboardUtils.createWeaponTypeKeyboard(weaponTypes);

    await ctx.reply(
      `🔍 Step-by-Step Item Search\n\n` + `Step 1: Choose item type\n\n`,
      {
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      }
    );
  }

  static async handleRestart(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    // Clear any existing search session
    SearchService.clearSearchSession(user.id.toString());

    // Get weapon types
    const weaponTypes = await SearchService.getWeaponTypes();

    if (weaponTypes.length === 0) {
      await ctx.reply(
        "❌ No weapon types found. Please import items first using /import-csv"
      );
      return;
    }

    // Create search session
    SearchService.createSearchSession(user.id.toString());

    // Create inline keyboard for weapon types using utility
    const keyboard = KeyboardUtils.createWeaponTypeKeyboard(weaponTypes, false);

    await ctx.reply(
      `🔄 Search Session Restarted!\n\n` + `Step 1: Choose item type\n\n`,
      {
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      }
    );
  }
}
