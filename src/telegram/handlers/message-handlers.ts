import { Context } from "telegraf";
import { UserService } from "../../database";
import { AlertHandlers } from "./alert-handlers";
import { PriceHandlers } from "./price-handlers";

export class MessageHandlers {
  static async handleTextMessage(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    const messageText = (ctx.message as any)?.text?.trim() || "";

    // Check if this is a reply to a prompt or a price check (for creating alerts)
    if (
      (ctx.message as any)?.reply_to_message &&
      "text" in (ctx.message as any).reply_to_message
    ) {
      const repliedText = (ctx.message as any).reply_to_message.text;

      // Handle ForceReply prompts created by inline buttons
      const promptMatch = repliedText.match(
        /^🔔 (Drop|Increase) alert: .* for (.+)$|^🎯 Target alert: .* for (.+)$/s
      );

      if (promptMatch) {
        await AlertHandlers.handleForceReplyAlert(ctx, promptMatch);
        return;
      }

      // Fallback: user replied directly to the price message with an alert value
      await AlertHandlers.handleAlertCreation(ctx, repliedText, messageText);
      return;
    }

    // Check if this is a command to remove an alert
    if (messageText.toLowerCase().startsWith("remove ")) {
      // Handle alert removal (simplified for now)
      await ctx.reply("🗑️ Alert removal feature coming soon!");
      return;
    }

    // Simple helpers for extra commands typed as text
    if (
      ["drop alert", "increase alert", "target alert"].includes(
        messageText.toLowerCase()
      )
    ) {
      await ctx.reply(
        "Send an item name to check its price, then use the buttons under the result to create an alert."
      );
      return;
    }

    // If it looks like an alert input but isn't a reply, guide the user
    const looksLikePercent = /^([+-]?)(\d+(?:\.\d+)?)%$/.test(messageText);
    const numericValue = parseFloat(messageText);
    const looksLikeAbsolute = !isNaN(numericValue) && numericValue > 0;
    if (
      (looksLikePercent || looksLikeAbsolute) &&
      !(ctx.message as any)?.reply_to_message
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
    if (messageText.toLowerCase().startsWith("currency ")) {
      await this.handleCurrencySetting(ctx, messageText);
      return;
    }

    // Regular price check
    if (!messageText) {
      await ctx.reply("Send the Steam Market item name to check its price.");
      return;
    }

    // Handle direct price check
    await PriceHandlers.handleDirectPriceCheck(ctx, messageText);
  }

  private static async handleCurrencySetting(
    ctx: Context,
    messageText: string
  ) {
    const user = ctx.from;
    if (!user) return;

    const currencyCode = messageText.split(" ")[1]?.toUpperCase();
    const { getAvailableCurrencies } = await import("../../steam");
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
  }
}
