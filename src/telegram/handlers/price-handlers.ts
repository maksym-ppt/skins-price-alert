import { Context } from "telegraf";
import { join, link } from "telegraf/format";
import { UserService } from "../../database";
import { SearchService } from "../../search-service";
import { Apps, Currency, getSteamPrice } from "../../steam";
import { KeyboardUtils } from "../utils/keyboard-utils";

export class PriceHandlers {
  static async handlePriceCheckFromSearch(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    const session = SearchService.getSearchSession(user.id.toString());
    if (!session || !session.finalName) {
      await ctx.answerCbQuery(
        "❌ Search session expired. Please use /search again."
      );
      return;
    }

    const itemName = session.finalName;

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
      itemId: session.itemId,
    });

    const cacheIndicator = priceResult.cached ? " (cached)" : "";
    const rateLimitInfo = `\n📊 Rate limit: ${rateLimit.remaining} checks remaining this minute`;

    await ctx.editMessageText(
      join([
        `💰 Price Check Result${cacheIndicator}${rateLimitInfo}\n\n`,
        `📦 Item: "${itemName}"\n\n`,
        `${priceResult.message}\n`,
        ...(priceResult.marketUrl
          ? [link("🔗 View on Steam Market", priceResult.marketUrl)]
          : []),
        '\n\n💡 Tip: Tap a button below, then reply with a number:\n• Drop: 10 → -10%\n• Increase: 20 → +20%\n• Target: 50 → $50\nOr reply to this message with "50", "-10%", or "+20%".',
      ]),
      {
        reply_markup: KeyboardUtils.createAlertButtonsWithSearchKeyboard(),
      }
    );
  }

  static async handleDirectPriceCheck(ctx: Context, message: string) {
    const user = ctx.from;
    if (!user) return;

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
        reply_markup: KeyboardUtils.createAlertButtonsKeyboard(),
        reply_parameters: ctx.message?.message_id
          ? { message_id: ctx.message.message_id }
          : undefined,
      }
    );
  }
}
