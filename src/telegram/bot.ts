import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { AlertHandlers } from "./handlers/alert-handlers";
import { CommandHandlers } from "./handlers/command-handlers";
import { MessageHandlers } from "./handlers/message-handlers";
import { PriceHandlers } from "./handlers/price-handlers";
import { SearchHandlers } from "./handlers/search-handlers";

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Auto-register users when they start the bot
bot.start(CommandHandlers.handleStart);

// Help command
bot.help(CommandHandlers.handleHelp);

// Games command
bot.command("games", CommandHandlers.handleGames);

// Currency command
bot.command("currency", CommandHandlers.handleCurrency);

// Profile command
bot.command("profile", CommandHandlers.handleProfile);

// Alerts command
bot.command("alerts", CommandHandlers.handleAlerts);

// Search command - Step-by-step item search
bot.command("search", CommandHandlers.handleSearch);

// Restart command - Restart current search session
bot.command("restart", CommandHandlers.handleRestart);

// Inline button actions for creating alerts quickly
bot.action("ALERT_DROP", AlertHandlers.handleAlertDrop);
bot.action("ALERT_INCREASE", AlertHandlers.handleAlertIncrease);
bot.action("ALERT_TARGET", AlertHandlers.handleAlertTarget);

// Handle search type selection
bot.action(/^search_type_(.+)$/, async (ctx) => {
  const weaponType = decodeURIComponent(ctx.match[1]);
  await SearchHandlers.handleSearchTypeSelection(ctx, weaponType);
});

// Handle weapon name selection
bot.action(/^search_weapon_(.+)$/, async (ctx) => {
  const weaponName = decodeURIComponent(ctx.match[1]);
  await SearchHandlers.handleWeaponNameSelection(ctx, weaponName);
});

// Handle skin name selection
bot.action(/^search_skin_(.+)$/, async (ctx) => {
  const skinName = decodeURIComponent(ctx.match[1]);
  await SearchHandlers.handleSkinNameSelection(ctx, skinName);
});

// Handle condition selection
bot.action(/^search_condition_(.+)$/, async (ctx) => {
  const condition = decodeURIComponent(ctx.match[1]);
  await SearchHandlers.handleConditionSelection(ctx, condition);
});

// Handle category selection
bot.action(/^search_category_(.+)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  await SearchHandlers.handleCategorySelection(ctx, categoryId);
});

// Handle price check from search
bot.action("check_price_from_search", PriceHandlers.handlePriceCheckFromSearch);

// Handle search restart
bot.action("search_restart", SearchHandlers.handleSearchRestart);

// Handle search cancel
bot.action("search_cancel", SearchHandlers.handleSearchCancel);

// Handle text messages
bot.on(message("text"), MessageHandlers.handleTextMessage);

// --- Serverless handler for Vercel ---
export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    res.status(200).end("ok");
  } else {
    res.status(200).send("Telegram Bot is running.");
  }
}

export { bot };
