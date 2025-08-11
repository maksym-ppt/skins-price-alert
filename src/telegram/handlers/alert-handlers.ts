import { Context, Markup } from "telegraf";
import { AlertService, UserService } from "../../database";
import { SearchService } from "../../search-service";
import { Apps, Currency, getSteamPrice } from "../../steam";

export class AlertHandlers {
  static async handleAlertDrop(ctx: Context) {
    try {
      await ctx.answerCbQuery();
      const user = ctx.from;
      if (!user) return;

      let itemName: string | undefined;

      // First try to get item from search session
      const session = SearchService.getSearchSession(user.id.toString());
      if (session?.finalName) {
        itemName = session.finalName;
      } else {
        // Fallback: try to get from replied message
        const cbMessage: any = (ctx.callbackQuery as any)?.message as any;
        itemName = cbMessage?.reply_to_message?.text;

        // Fallback: try to extract quoted name from message text if present
        if (!itemName) {
          const selfText: string | undefined = cbMessage?.text;
          const quotedMatch =
            typeof selfText === "string"
              ? selfText.match(/\"([^\"]+)\"/)
              : null;
          itemName = quotedMatch ? quotedMatch[1] : undefined;
        }
      }

      if (!itemName) {
        await ctx.reply(
          "❗ Please send an item name first, then use the buttons under the result."
        );
        return;
      }

      await ctx.reply(
        `🔔 Drop alert: Reply with percentage (e.g. 10) for ${itemName}`,
        { reply_markup: Markup.forceReply().reply_markup }
      );
    } catch (err) {
      console.error("Error handling ALERT_DROP:", err);
    }
  }

  static async handleAlertIncrease(ctx: Context) {
    try {
      await ctx.answerCbQuery();
      const user = ctx.from;
      if (!user) return;

      let itemName: string | undefined;

      // First try to get item from search session
      const session = SearchService.getSearchSession(user.id.toString());
      if (session?.finalName) {
        itemName = session.finalName;
      } else {
        // Fallback: try to get from replied message
        const cbMessage: any = (ctx.callbackQuery as any)?.message as any;
        itemName = cbMessage?.reply_to_message?.text;

        // Fallback: try to extract quoted name from message text if present
        if (!itemName) {
          const selfText: string | undefined = cbMessage?.text;
          const quotedMatch =
            typeof selfText === "string"
              ? selfText.match(/\"([^\"]+)\"/)
              : null;
          itemName = quotedMatch ? quotedMatch[1] : undefined;
        }
      }

      if (!itemName) {
        await ctx.reply(
          "❗ Please send an item name first, then use the buttons under the result."
        );
        return;
      }

      await ctx.reply(
        `🔔 Increase alert: Reply with percentage (e.g. 10) for ${itemName}`,
        { reply_markup: Markup.forceReply().reply_markup }
      );
    } catch (err) {
      console.error("Error handling ALERT_INCREASE:", err);
    }
  }

  static async handleAlertTarget(ctx: Context) {
    try {
      await ctx.answerCbQuery();
      const user = ctx.from;
      if (!user) return;

      let itemName: string | undefined;

      // First try to get item from search session
      const session = SearchService.getSearchSession(user.id.toString());
      if (session?.finalName) {
        itemName = session.finalName;
      } else {
        // Fallback: try to get from replied message
        const cbMessage: any = (ctx.callbackQuery as any)?.message as any;
        itemName = cbMessage?.reply_to_message?.text;

        // Fallback: try to extract quoted name from message text if present
        if (!itemName) {
          const selfText: string | undefined = cbMessage?.text;
          const quotedMatch =
            typeof selfText === "string"
              ? selfText.match(/\"([^\"]+)\"/)
              : null;
          itemName = quotedMatch ? quotedMatch[1] : undefined;
        }
      }

      if (!itemName) {
        await ctx.reply(
          "❗ Please send an item name first, then use the buttons under the result."
        );
        return;
      }

      let currencyCode = "USD";
      try {
        const dbUser = await UserService.getUser(user.id);
        currencyCode = dbUser?.preferences?.currency || "USD";
      } catch (_) {}

      await ctx.reply(
        `🎯 Target alert: Reply with target price (e.g. 50) in ${currencyCode} for ${itemName}`,
        { reply_markup: Markup.forceReply().reply_markup }
      );
    } catch (err) {
      console.error("Error handling ALERT_TARGET:", err);
    }
  }

  static parseAlertInput(
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

  static async handleAlertCreation(
    ctx: Context,
    itemName: string,
    alertInput: string
  ) {
    const user = ctx.from;
    if (!user) return;

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
    const alertConfig = this.parseAlertInput(alertInput, currentPrice);

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

    // Get item_id from search session if available
    const session = SearchService.getSearchSession(user.id.toString());
    const itemId = session?.itemId;

    const alert = await AlertService.createAlert(
      dbUser.id,
      itemName,
      alertConfig.targetPrice,
      alertConfig.alertType,
      alertConfig.percentageThreshold,
      alertConfig.basePrice,
      itemId
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
  }

  static async handleForceReplyAlert(
    ctx: Context,
    promptMatch: RegExpMatchArray
  ) {
    const user = ctx.from;
    if (!user) return;

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
    const numericOnly = (ctx.message as any)?.text?.trim() || "";
    const numericValue = parseFloat(numericOnly.replace(/[^\d.]/g, ""));
    if (isNaN(numericValue) || numericValue <= 0) {
      await ctx.reply("❌ Please enter a valid number.");
      return;
    }

    let normalizedInput = numericOnly;
    if (isDropOrIncrease) {
      if (typeLabel === "Drop") normalizedInput = `-${numericValue}%`;
      else if (typeLabel === "Increase") normalizedInput = `+${numericValue}%`;
    } else {
      // Target alert path -> absolute price
      normalizedInput = `${numericValue}`;
    }

    await this.handleAlertCreation(ctx, itemName, normalizedInput);
  }
}
