import { Markup, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { join, link } from "telegraf/format";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_IDS,
  DEFAULT_TIER,
  SKIN_CONDITIONS,
  TIER_DISPLAY_NAMES,
  TIER_LIMITS,
} from "../src/constants";
import { AlertService, UserService } from "../src/database";
import { SearchService } from "../src/search-service";
import {
  Apps,
  Currency,
  getAvailableCurrencies,
  getAvailableGames,
  getSteamPrice,
} from "../src/steam";

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Auto-register users when they start the bot
bot.start(async (ctx) => {
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
});

// Help command
bot.help(async (ctx) => {
  await ctx.reply(
    `🎮 Steam Skins Price Alert Bot Help\n\n` +
      `📋 Commands:\n` +
      `• /start - Welcome message and registration\n` +
      `• /search - Step-by-step item search\n` +
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
});

// Games command
bot.command("games", async (ctx) => {
  const games = getAvailableGames();
  let message = `🎮 Supported Games:\n\n`;

  Object.entries(games).forEach(([name, id]) => {
    message += `• ${name} (ID: ${id})\n`;
  });

  message += `\n💡 Default game is Counter-Strike 2.`;

  await ctx.reply(message);
});

// Currency command
bot.command("currency", async (ctx) => {
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
});

// Profile command
bot.command("profile", async (ctx) => {
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
      `📅 Registered: ${new Date(dbUser.created_at).toLocaleDateString()}\n\n` +
      `⚙️ Preferences:\n` +
      `• Currency: ${preferences.currency}\n` +
      `• Language: ${preferences.language}\n` +
      `• Notifications: ${preferences.notifications ? "✅ On" : "❌ Off"}\n\n` +
      `📊 Usage (${limits.tier} tier):\n` +
      `• Price checks: ${usage.price_checks_this_minute}/${limits.price_checks_per_minute}/minute\n` +
      `• Alerts: ${usage.alerts_created}/${limits.max_alerts}`
  );
});

// Alerts command
bot.command("alerts", async (ctx) => {
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
    alerts.forEach((alert, index) => {
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
});

// Inline button actions for creating alerts quickly (get item from replied message)
bot.action("ALERT_DROP", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const cbMessage: any = (ctx.callbackQuery as any)?.message as any;
    // Try to infer item from the original user message this price message replied to
    const itemName: string | undefined = cbMessage?.reply_to_message?.text;
    // Fallback: try to extract quoted name from message text if present
    const selfText: string | undefined = cbMessage?.text;
    const quotedMatch =
      typeof selfText === "string" ? selfText.match(/\"([^\"]+)\"/) : null;
    const resolvedItem = itemName || (quotedMatch ? quotedMatch[1] : undefined);
    if (!itemName) {
      await ctx.reply(
        "❗ Please send an item name first, then use the buttons under the result."
      );
      return;
    }

    await ctx.reply(
      `🔔 Drop alert: Reply with percentage (e.g. 10) for ${resolvedItem}`,
      { reply_markup: Markup.forceReply().reply_markup }
    );
  } catch (err) {
    console.error("Error handling ALERT_DROP:", err);
  }
});

bot.action("ALERT_INCREASE", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const cbMessage: any = (ctx.callbackQuery as any)?.message as any;
    const itemName: string | undefined = cbMessage?.reply_to_message?.text;
    const selfText: string | undefined = cbMessage?.text;
    const quotedMatch =
      typeof selfText === "string" ? selfText.match(/\"([^\"]+)\"/) : null;
    const resolvedItem = itemName || (quotedMatch ? quotedMatch[1] : undefined);
    if (!itemName) {
      await ctx.reply(
        "❗ Please send an item name first, then use the buttons under the result."
      );
      return;
    }

    await ctx.reply(
      `🔔 Increase alert: Reply with percentage (e.g. 10) for ${resolvedItem}`,
      { reply_markup: Markup.forceReply().reply_markup }
    );
  } catch (err) {
    console.error("Error handling ALERT_INCREASE:", err);
  }
});

bot.action("ALERT_TARGET", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const cbMessage: any = (ctx.callbackQuery as any)?.message as any;
    const itemName: string | undefined = cbMessage?.reply_to_message?.text;
    const selfText: string | undefined = cbMessage?.text;
    const quotedMatch =
      typeof selfText === "string" ? selfText.match(/\"([^\"]+)\"/) : null;
    const resolvedItem = itemName || (quotedMatch ? quotedMatch[1] : undefined);
    if (!itemName) {
      await ctx.reply(
        "❗ Please send an item name first, then use the buttons under the result."
      );
      return;
    }

    const from = ctx.from;
    let currencyCode = "USD";
    try {
      const dbUser = from ? await UserService.getUser(from.id) : null;
      currencyCode = dbUser?.preferences?.currency || "USD";
    } catch (_) {}

    await ctx.reply(
      `🎯 Target alert: Reply with target price (e.g. 50) in ${currencyCode} for ${resolvedItem}`,
      { reply_markup: Markup.forceReply().reply_markup }
    );
  } catch (err) {
    console.error("Error handling ALERT_TARGET:", err);
  }
});

// Search command - Step-by-step item search
bot.command("search", async (ctx) => {
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

  // Create inline keyboard for weapon types
  const keyboard = [];

  // Group weapon types into rows of 2 buttons each
  for (let i = 0; i < weaponTypes.length; i += 2) {
    const row = [];
    row.push(
      Markup.button.callback(
        weaponTypes[i],
        `search_type_${encodeURIComponent(weaponTypes[i])}`
      )
    );

    // Add second button to the row if available
    if (i + 1 < weaponTypes.length) {
      row.push(
        Markup.button.callback(
          weaponTypes[i + 1],
          `search_type_${encodeURIComponent(weaponTypes[i + 1])}`
        )
      );
    }

    keyboard.push(row);
  }

  // Add cancel button in the last row
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.reply(
    `🔍 Step-by-Step Item Search\n\n` + `Step 1: Choose item type\n\n`,
    // `Available types:\n` +
    // weaponTypes
    //   .map((type, index) => {
    //     const isEven = index % 2 === 0;
    //     const isLast = index === weaponTypes.length - 1;
    //     const nextType = weaponTypes[index + 1];

    //     if (isEven && nextType) {
    //       return `• ${type.padEnd(15)} • ${nextType}`;
    //     } else if (isEven && isLast) {
    //       return `• ${type}`;
    //     } else if (!isEven) {
    //       return ""; // Skip odd indices as they're handled above
    //     }
    //     return `• ${type}`;
    //   })
    //   .filter((line) => line !== "")
    //   .join("\n"),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
});

// Handle search type selection
bot.action(/^search_type_(.+)$/, async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const weaponType = decodeURIComponent(ctx.match[1]);
  const session = SearchService.getSearchSession(user.id.toString());

  if (!session) {
    await ctx.answerCbQuery(
      "❌ Search session expired. Please use /search again."
    );
    return;
  }

  // Update session
  SearchService.updateSearchSession(user.id.toString(), {
    step: "weapon_name",
    weaponType,
  });

  // Get weapon names for this type
  const weaponNames = await SearchService.getWeaponNames(weaponType);

  if (weaponNames.length === 0) {
    await ctx.answerCbQuery("❌ No weapons found for this type.");
    return;
  }

  // Create keyboard for weapon names (limit to 20 to avoid Telegram limits)
  const keyboard = weaponNames
    .slice(0, 20)
    .map((name) => [
      Markup.button.callback(name, `search_weapon_${encodeURIComponent(name)}`),
    ]);
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.editMessageText(
    `🔍 Step-by-Step Item Search\n\n` +
      `Step 2: Choose item name\n\n` +
      `Type: ${weaponType}\n`,
    // `Available weapons:\n` +
    // weaponNames
    //   .slice(0, 20)
    //   .map((name) => `• ${name}`)
    //   .join("\n") +
    // (weaponNames.length > 20
    //   ? `\n... and ${weaponNames.length - 20} more`
    //   : ""),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
});

// Handle weapon name selection
bot.action(/^search_weapon_(.+)$/, async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const weaponName = decodeURIComponent(ctx.match[1]);
  const session = SearchService.getSearchSession(user.id.toString());

  if (!session) {
    await ctx.answerCbQuery(
      "❌ Search session expired. Please use /search again."
    );
    return;
  }

  // Update session
  SearchService.updateSearchSession(user.id.toString(), {
    step: "skin_name",
    weaponName,
  });

  // Get skin names for this weapon
  const skinNames = await SearchService.getSkinNames(weaponName);

  if (skinNames.length === 0) {
    // No skins available - this should only happen for knives
    const session = SearchService.getSearchSession(user.id.toString());
    if (session?.weaponType?.toLowerCase() === "knife") {
      await handleNoSkins(ctx, session.weaponType!, weaponName);
    } else {
      await ctx.answerCbQuery(
        "❌ No skins found for this weapon. This might be a data issue."
      );
      await ctx.editMessageText(
        `❌ No skins found for ${weaponName}\n\n` +
          `This weapon doesn't have any skins in the database.\n` +
          `Please try another weapon or contact support.`,
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback("🔄 Start Over", "search_restart")],
            [Markup.button.callback("❌ Cancel", "search_cancel")],
          ]).reply_markup,
        }
      );
    }
    return;
  }

  // Create keyboard for skin names
  const keyboard = skinNames
    // .slice(0, 20)
    .map((skin) => [
      Markup.button.callback(skin, `search_skin_${encodeURIComponent(skin)}`),
    ]);
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.editMessageText(
    `🔍 Step-by-Step Item Search\n\n` +
      `Step 3: Choose skin name\n\n` +
      `Type: ${session.weaponType}\n` +
      `Name: ${weaponName}\n`,
    // `Available skins:\n` +
    // skinNames
    //   .slice(0, 20)
    //   .map((skin) => `• ${skin}`)
    //   .join("\n") +
    // (skinNames.length > 20 ? `\n... and ${skinNames.length - 20} more` : ""),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
});

// Handle skin name selection
bot.action(/^search_skin_(.+)$/, async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const skinName = decodeURIComponent(ctx.match[1]);
  const session = SearchService.getSearchSession(user.id.toString());

  if (!session) {
    await ctx.answerCbQuery(
      "❌ Search session expired. Please use /search again."
    );
    return;
  }

  // Update session
  SearchService.updateSearchSession(user.id.toString(), {
    step: "condition",
    skinName,
  });

  // Create keyboard for skin conditions
  const keyboard = SKIN_CONDITIONS.map((condition) => [
    Markup.button.callback(
      condition,
      `search_condition_${encodeURIComponent(condition)}`
    ),
  ]);
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.editMessageText(
    `🔍 Step-by-Step Item Search\n\n` +
      `Step 4: Choose condition\n\n` +
      `Type: ${session.weaponType}\n` +
      `Name: ${session.weaponName}\n` +
      `Skin: ${skinName}\n` +
      `Available conditions:\n`,
    // SKIN_CONDITIONS.map((condition) => `• ${condition}`).join("\n"),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
});

// Handle condition selection
bot.action(/^search_condition_(.+)$/, async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const condition = decodeURIComponent(ctx.match[1]) as any;
  const session = SearchService.getSearchSession(user.id.toString());

  if (!session) {
    await ctx.answerCbQuery(
      "❌ Search session expired. Please use /search again."
    );
    return;
  }

  // Update session
  SearchService.updateSearchSession(user.id.toString(), {
    step: "category",
    condition,
  });

  // Get available categories based on weapon type
  const categories = SearchService.getAvailableCategories(session.weaponType!);

  // Create keyboard for categories
  const keyboard = categories.map((category) => [
    Markup.button.callback(
      category,
      `search_category_${CATEGORY_IDS[category as keyof typeof CATEGORY_IDS]}`
    ),
  ]);
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.editMessageText(
    `🔍 Step-by-Step Item Search\n\n` +
      `Step 5: Choose category\n\n` +
      `Type: ${session.weaponType}\n` +
      `Name: ${session.weaponName}\n` +
      `Skin: ${session.skinName}\n` +
      `Condition: ${condition}\n` +
      `Available categories:\n`,
    // categories.map((category) => `• ${category}`).join("\n"),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
});

// Handle category selection
bot.action(/^search_category_(.+)$/, async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const categoryId = ctx.match[1];
  const category =
    CATEGORY_DISPLAY_NAMES[categoryId as keyof typeof CATEGORY_DISPLAY_NAMES];
  const session = SearchService.getSearchSession(user.id.toString());

  if (!session) {
    await ctx.answerCbQuery(
      "❌ Search session expired. Please use /search again."
    );
    return;
  }

  // Generate final item name
  const finalName = SearchService.generateItemName(
    session.weaponType!,
    session.weaponName!,
    session.skinName || null,
    session.condition!,
    category
  );

  // Update session
  SearchService.updateSearchSession(user.id.toString(), {
    step: "complete",
    category,
    finalName,
  });

  // Check if item exists in database
  const exists = await SearchService.validateItemName(
    session.weaponType!,
    session.weaponName!,
    session.skinName || null,
    session.condition!,
    category
  );

  if (!exists) {
    // Get similar items for suggestions
    const similarItems = await SearchService.getSimilarItems(
      session.weaponName!,
      session.skinName || null
    );

    let message =
      `❌ Item not found in database\n\n` + `Generated name: ${finalName}\n\n`;

    if (similarItems.length > 0) {
      message +=
        `Similar items found:\n` +
        similarItems.map((item) => `• ${item}`).join("\n") +
        "\n\n";
    }

    message += `💡 Try searching manually or use /search again.`;

    await ctx.editMessageText(message, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Start Over", "search_restart")],
        [Markup.button.callback("❌ Cancel", "search_cancel")],
      ]).reply_markup,
    });
    return;
  }

  // Item found, show price check
  await ctx.editMessageText(
    `✅ Item found!\n\n` +
      `Generated name: ${finalName}\n\n` +
      `Click below to check the price:`,
    {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "💰 Check Price",
            `check_price_${encodeURIComponent(finalName)}`
          ),
        ],
        [Markup.button.callback("🔄 Search Another", "search_restart")],
        [Markup.button.callback("❌ Cancel", "search_cancel")],
      ]).reply_markup,
    }
  );
});

// Helper function for weapons without skins
async function handleNoSkins(ctx: any, weaponType: string, weaponName: string) {
  const user = ctx.from;
  if (!user) return;

  const session = SearchService.getSearchSession(user.id.toString());

  if (!session) {
    await ctx.answerCbQuery(
      "❌ Search session expired. Please use /search again."
    );
    return;
  }

  // Update session
  SearchService.updateSearchSession(user.id.toString(), {
    step: "condition",
    skinName: undefined,
  });

  // Create keyboard for skin conditions
  const keyboard = SKIN_CONDITIONS.map((condition) => [
    Markup.button.callback(
      condition,
      `search_condition_${encodeURIComponent(condition)}`
    ),
  ]);
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.editMessageText(
    `🔍 Step-by-Step Item Search\n\n` +
      `Step 4: Choose skin condition\n\n` +
      `Type: ${weaponType}\n` +
      `Weapon: ${weaponName}\n` +
      `Skin: None (base weapon)\n` +
      `Available conditions:\n` +
      SKIN_CONDITIONS.map((condition) => `• ${condition}`).join("\n"),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
}

// Handle price check from search
bot.action(/^check_price_(.+)$/, async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const itemName = decodeURIComponent(ctx.match[1]);

  // Check rate limits
  const rateLimit = await UserService.canMakePriceCheck(user.id);
  if (!rateLimit.allowed) {
    await ctx.answerCbQuery(
      "⏰ Rate limit exceeded. Please wait before checking another price."
    );
    return;
  }

  // Increment usage counter
  await UserService.incrementPriceCheck(user.id);

  // Get price
  const priceResult = await getSteamPrice(itemName, {
    appId: Apps.CS2,
    currency: Currency.USD,
  });

  const cacheIndicator = priceResult.cached ? " (cached)" : "";
  const rateLimitInfo = `\n📊 Rate limit: ${rateLimit.remaining} checks remaining this minute`;

  await ctx.editMessageText(
    join([
      `💰 Price Check Result${cacheIndicator}${rateLimitInfo}\n\n`,
      `${priceResult.message}\n`,
      ...(priceResult.marketUrl
        ? [link("🔗 View on Steam Market", priceResult.marketUrl)]
        : []),
      '\n\n💡 Tip: Tap a button below, then reply with a number:\n• Drop: 10 → -10%\n• Increase: 20 → +20%\n• Target: 50 → $50\nOr reply to this message with "50", "-10%", or "+20%".',
    ]),
    {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("📉 Drop alert", "ALERT_DROP"),
          Markup.button.callback("📈 Increase alert", "ALERT_INCREASE"),
          Markup.button.callback("🎯 Target alert", "ALERT_TARGET"),
        ],
        [Markup.button.callback("🔄 Search Another", "search_restart")],
        [Markup.button.callback("❌ Close", "search_cancel")],
      ]).reply_markup,
    }
  );
});

// Handle search restart
bot.action("search_restart", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  // Clear session and start over
  SearchService.clearSearchSession(user.id.toString());

  // Redirect to /search command
  await ctx.answerCbQuery("🔄 Starting new search...");

  // Simulate /search command
  const weaponTypes = await SearchService.getWeaponTypes();

  if (weaponTypes.length === 0) {
    await ctx.editMessageText(
      "❌ No weapon types found. Please import items first using /import-csv"
    );
    return;
  }

  // Create search session
  SearchService.createSearchSession(user.id.toString());

  // Create inline keyboard for weapon types
  const keyboard = [];

  // Group weapon types into rows of 2 buttons each
  for (let i = 0; i < weaponTypes.length; i += 2) {
    const row = [];
    row.push(
      Markup.button.callback(
        weaponTypes[i],
        `search_type_${encodeURIComponent(weaponTypes[i])}`
      )
    );

    // Add second button to the row if available
    if (i + 1 < weaponTypes.length) {
      row.push(
        Markup.button.callback(
          weaponTypes[i + 1],
          `search_type_${encodeURIComponent(weaponTypes[i + 1])}`
        )
      );
    }

    keyboard.push(row);
  }

  // Add cancel button in the last row
  keyboard.push([Markup.button.callback("❌ Cancel", "search_cancel")]);

  await ctx.editMessageText(
    `🔍 Step-by-Step Item Search\n\n` +
      `Step 1: Choose weapon type\n\n` +
      `Available types:\n` +
      weaponTypes
        .map((type, index) => {
          const isEven = index % 2 === 0;
          const isLast = index === weaponTypes.length - 1;
          const nextType = weaponTypes[index + 1];

          if (isEven && nextType) {
            return `• ${type.padEnd(15)} • ${nextType}`;
          } else if (isEven && isLast) {
            return `• ${type}`;
          } else if (!isEven) {
            return ""; // Skip odd indices as they're handled above
          }
          return `• ${type}`;
        })
        .filter((line) => line !== "")
        .join("\n"),
    {
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    }
  );
});

// Handle search cancel
bot.action("search_cancel", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  // Clear search session
  SearchService.clearSearchSession(user.id.toString());

  await ctx.editMessageText(
    "❌ Search cancelled.\n\nUse /search to start a new search or send an item name directly to check its price."
  );
});

// Helper function to parse alert input
function parseAlertInput(
  input: string,
  currentPrice: number
): {
  alertType: "absolute" | "percentage_drop" | "percentage_increase";
  targetPrice: number;
  percentageThreshold?: number;
  basePrice?: number;
} | null {
  input = input.trim();

  // Check for percentage patterns
  const percentageMatch = input.match(/^([+-]?)(\d+(?:\.\d+)?)%$/);
  if (percentageMatch) {
    const sign = percentageMatch[1];
    const percentage = parseFloat(percentageMatch[2]);

    if (sign === "-") {
      // Percentage drop
      const targetPrice = currentPrice * (1 - percentage / 100);
      return {
        alertType: "percentage_drop",
        targetPrice,
        percentageThreshold: percentage,
        basePrice: currentPrice,
      };
    } else if (sign === "+") {
      // Percentage increase
      const targetPrice = currentPrice * (1 + percentage / 100);
      return {
        alertType: "percentage_increase",
        targetPrice,
        percentageThreshold: percentage,
        basePrice: currentPrice,
      };
    }
  }

  // Check for absolute price
  const absolutePrice = parseFloat(input);
  if (!isNaN(absolutePrice) && absolutePrice > 0) {
    return {
      alertType: "absolute",
      targetPrice: absolutePrice,
    };
  }

  return null;
}

// Handle text messages
bot.on(message("text"), async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const message = ctx.message.text.trim();

  // Check if this is a reply to a prompt or a price check (for creating alerts)
  if (ctx.message.reply_to_message && "text" in ctx.message.reply_to_message) {
    const repliedText = ctx.message.reply_to_message.text;

    // Handle ForceReply prompts created by inline buttons
    const promptMatch = repliedText.match(
      /^🔔 (Drop|Increase) alert: .* for (.+)$|^🎯 Target alert: .* for (.+)$/s
    );

    if (promptMatch) {
      const isDropOrIncrease = !!promptMatch[1];
      const typeLabel = promptMatch[1];
      const itemName = (promptMatch[2] || promptMatch[3] || "").trim();

      if (!itemName) {
        await ctx.reply(
          "❌ Could not detect item name. Please send the item name again."
        );
        return;
      }

      // Get current price for calculations
      const priceResult = await getSteamPrice(itemName, {
        appId: Apps.CS2,
        currency: Currency.USD,
      });

      if (!priceResult.success || !priceResult.price) {
        await ctx.reply(
          "❌ Could not get current price for this item. Please try again."
        );
        return;
      }

      const currentPrice = priceResult.price;

      // Interpret numeric-only input according to prompt type
      const numericOnly = ctx.message.text.trim();
      const numericValue = parseFloat(numericOnly.replace(/[^\d.]/g, ""));
      if (isNaN(numericValue) || numericValue <= 0) {
        await ctx.reply("❌ Please enter a valid number.");
        return;
      }

      let normalizedInput = numericOnly;
      if (isDropOrIncrease) {
        if (typeLabel === "Drop") normalizedInput = `-${numericValue}%`;
        else if (typeLabel === "Increase")
          normalizedInput = `+${numericValue}%`;
      } else {
        // Target alert path -> absolute price
        normalizedInput = `${numericValue}`;
      }

      const alertConfig = parseAlertInput(normalizedInput, currentPrice);
      if (!alertConfig) {
        await ctx.reply(
          `❌ Invalid alert format! Please send just a number like 10 or 50.`
        );
        return;
      }

      const dbUser = await UserService.getUser(user.id);
      if (!dbUser) {
        await ctx.reply("❌ User not found. Please use /start to register.");
        return;
      }

      // Check alert limits
      const alertCheck = await UserService.canCreateAlert(user.id);
      if (!alertCheck.allowed) {
        await ctx.reply(
          `❌ Alert limit reached!\n\nYou have ${alertCheck.current}/${alertCheck.limit} alerts.\nUpgrade to premium for more alerts.`
        );
        return;
      }

      const alert = await AlertService.createAlert(
        dbUser.id,
        itemName,
        alertConfig.targetPrice,
        alertConfig.alertType,
        alertConfig.percentageThreshold,
        alertConfig.basePrice
      );

      if (alert) {
        let alertMessage = `✅ Price alert created!\n\n`;
        alertMessage += `Item: ${itemName}\n`;

        if (alertConfig.alertType === "absolute") {
          alertMessage += `Type: Absolute price\n`;
          alertMessage += `Target: $${alertConfig.targetPrice}\n`;
        } else if (alertConfig.alertType === "percentage_drop") {
          alertMessage += `Type: Percentage drop\n`;
          alertMessage += `Threshold: -${alertConfig.percentageThreshold}%\n`;
          alertMessage += `Base price: $${alertConfig.basePrice}\n`;
          alertMessage += `Target: $${alertConfig.targetPrice.toFixed(2)}\n`;
        } else if (alertConfig.alertType === "percentage_increase") {
          alertMessage += `Type: Percentage increase\n`;
          alertMessage += `Threshold: +${alertConfig.percentageThreshold}%\n`;
          alertMessage += `Base price: $${alertConfig.basePrice}\n`;
          alertMessage += `Target: $${alertConfig.targetPrice.toFixed(2)}\n`;
        }

        alertMessage += `\n📊 Alerts: ${alertCheck.current + 1}/${
          alertCheck.limit
        }`;

        await ctx.reply(alertMessage);
      } else {
        await ctx.reply("❌ Failed to create alert. Please try again.");
      }
      return;
    }

    // Fallback: user replied directly to the price message with an alert value
    const originalMessage = repliedText;

    // Get current price from the original message
    const priceResult = await getSteamPrice(originalMessage, {
      appId: Apps.CS2,
      currency: Currency.USD,
    });

    if (!priceResult.success || !priceResult.price) {
      await ctx.reply(
        "❌ Could not get current price for this item. Please try again."
      );
      return;
    }

    const currentPrice = priceResult.price;
    const alertConfig = parseAlertInput(message, currentPrice);

    if (!alertConfig) {
      await ctx.reply(
        `❌ Invalid alert format!\n\n` +
          `Valid formats:\n` +
          `• "50" - Alert at $50\n` +
          `• "-10%" - Alert when price drops 10%\n` +
          `• "+20%" - Alert when price increases 20%`
      );
      return;
    }

    // User is setting a price alert
    const dbUser = await UserService.getUser(user.id);
    if (!dbUser) {
      await ctx.reply("❌ User not found. Please use /start to register.");
      return;
    }

    // Check alert limits
    const alertCheck = await UserService.canCreateAlert(user.id);
    if (!alertCheck.allowed) {
      await ctx.reply(
        `❌ Alert limit reached!\n\n` +
          `You have ${alertCheck.current}/${alertCheck.limit} alerts.\n` +
          `Upgrade to premium for more alerts.`
      );
      return;
    }

    const alert = await AlertService.createAlert(
      dbUser.id,
      originalMessage,
      alertConfig.targetPrice,
      alertConfig.alertType,
      alertConfig.percentageThreshold,
      alertConfig.basePrice
    );

    if (alert) {
      let alertMessage = `✅ Price alert created!\n\n`;
      alertMessage += `Item: ${originalMessage}\n`;

      if (alertConfig.alertType === "absolute") {
        alertMessage += `Type: Absolute price\n`;
        alertMessage += `Target: $${alertConfig.targetPrice}\n`;
      } else if (alertConfig.alertType === "percentage_drop") {
        alertMessage += `Type: Percentage drop\n`;
        alertMessage += `Threshold: -${alertConfig.percentageThreshold}%\n`;
        alertMessage += `Base price: $${alertConfig.basePrice}\n`;
        alertMessage += `Target: $${alertConfig.targetPrice.toFixed(2)}\n`;
      } else if (alertConfig.alertType === "percentage_increase") {
        alertMessage += `Type: Percentage increase\n`;
        alertMessage += `Threshold: +${alertConfig.percentageThreshold}%\n`;
        alertMessage += `Base price: $${alertConfig.basePrice}\n`;
        alertMessage += `Target: $${alertConfig.targetPrice.toFixed(2)}\n`;
      }

      alertMessage += `\n📊 Alerts: ${alertCheck.current + 1}/${
        alertCheck.limit
      }`;

      await ctx.reply(alertMessage);
    } else {
      await ctx.reply("❌ Failed to create alert. Please try again.");
    }
    return;
  }

  // Check if this is a command to remove an alert
  if (message.toLowerCase().startsWith("remove ")) {
    // Handle alert removal (simplified for now)
    await ctx.reply("🗑️ Alert removal feature coming soon!");
    return;
  }

  // Simple helpers for extra commands typed as text
  if (
    ["drop alert", "increase alert", "target alert"].includes(
      message.toLowerCase()
    )
  ) {
    await ctx.reply(
      "Send an item name to check its price, then use the buttons under the result to create an alert."
    );
    return;
  }

  // If it looks like an alert input but isn't a reply, guide the user
  const looksLikePercent = /^([+-]?)(\d+(?:\.\d+)?)%$/.test(message);
  const numericValue = parseFloat(message);
  const looksLikeAbsolute = !isNaN(numericValue) && numericValue > 0;
  if (
    (looksLikePercent || looksLikeAbsolute) &&
    !ctx.message.reply_to_message
  ) {
    await ctx.reply(
      "💡 To create a price alert, first send an item name to check its price, then reply to that message with your alert like:\n" +
        '• "50" for $50 target\n' +
        '• "-10%" for 10% drop alert\n' +
        '• "+20%" for 20% increase alert'
    );
    return;
  }

  // Check if this is a currency setting command
  if (message.toLowerCase().startsWith("currency ")) {
    const currencyCode = message.split(" ")[1]?.toUpperCase();
    const currencies = getAvailableCurrencies();

    if (currencyCode && currencies[currencyCode]) {
      const success = await UserService.updatePreferences(user.id, {
        currency: currencyCode,
      });

      if (success) {
        await ctx.reply(`✅ Currency set to ${currencyCode}!`);
      } else {
        await ctx.reply("❌ Failed to update currency. Please try again.");
      }
    } else {
      await ctx.reply(
        `❌ Invalid currency code. Use /currency to see available currencies.`
      );
    }
    return;
  }

  // Regular price check
  if (!message) {
    await ctx.reply("Send the Steam Market item name to check its price.");
    return;
  }

  // Check rate limits
  const rateLimit = await UserService.canMakePriceCheck(user.id);
  if (!rateLimit.allowed) {
    const resetTime = rateLimit.resetTime
      ? new Date(rateLimit.resetTime)
      : new Date();
    const minutes = Math.ceil((resetTime.getTime() - Date.now()) / 60000);

    await ctx.reply(
      `⏰ Rate limit exceeded!\n\n` +
        `You've used all ${
          rateLimit.remaining + 1
        } price checks this minute.\n` +
        `Please wait ${minutes} minute(s) before trying again.\n\n` +
        `💡 Upgrade to premium for higher limits.`
    );
    return;
  }

  // Auto-register user if not already registered
  const dbUser = await UserService.getUser(user.id);
  if (!dbUser) {
    await UserService.registerUser(user.id, {
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    });
  }

  // Increment usage counter
  await UserService.incrementPriceCheck(user.id);

  // Get user preferences for currency
  const preferences = dbUser?.preferences || { currency: "USD" };
  const currency =
    Currency[preferences.currency as keyof typeof Currency] || Currency.USD;

  // Get price with caching
  const priceResult = await getSteamPrice(message, {
    appId: Apps.CS2, // Default to CS2
    currency: currency,
  });

  const cacheIndicator = priceResult.cached ? " (cached)" : "";
  const rateLimitInfo = `\n📊 Rate limit: ${rateLimit.remaining} checks remaining this minute`;

  await ctx.reply(
    join([
      `${priceResult.message}${cacheIndicator}${rateLimitInfo}\n`,
      ...(priceResult.marketUrl
        ? [link("🔗 View on Steam Market", priceResult.marketUrl)]
        : []),
      '\n\n💡 Tip: Tap a button below, then reply with a number:\n• Drop: 10 → -10%\n• Increase: 20 → +20%\n• Target: 50 → $50\nOr reply to this message with "50", "-10%", or "+20%".',
    ]),
    {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("📉 Drop alert", "ALERT_DROP"),
          Markup.button.callback("📈 Increase alert", "ALERT_INCREASE"),
          Markup.button.callback("🎯 Target alert", "ALERT_TARGET"),
        ],
      ]).reply_markup,
      reply_parameters: { message_id: ctx.message.message_id },
    }
  );
});

// --- Serverless handler for Vercel ---
export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    res.status(200).end("ok");
  } else {
    res.status(200).send("Telegram Bot is running.");
  }
}
