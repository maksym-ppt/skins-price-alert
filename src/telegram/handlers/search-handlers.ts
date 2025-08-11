import { Context, Markup } from "telegraf";
import { CATEGORY_DISPLAY_NAMES, SKIN_CONDITIONS } from "../../constants";
import { SearchService } from "../../search-service";
import { KeyboardUtils } from "../utils/keyboard-utils";

// Utility function to safely edit messages
async function safeEditMessage(ctx: Context, text: string, reply_markup: any) {
  try {
    await ctx.editMessageText(text, { reply_markup });
  } catch (error: any) {
    if (error.description?.includes("message is not modified")) {
      await ctx.answerCbQuery("✅ Updated!");
    } else {
      throw error;
    }
  }
}

export class SearchHandlers {
  static async handleSearchTypeSelection(ctx: Context, weaponType: string) {
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
      step: "weapon_name",
      weaponType,
    });

    // Get weapon names for this type
    const weaponNames = await SearchService.getWeaponNames(weaponType);

    if (weaponNames.length === 0) {
      await ctx.answerCbQuery("❌ No weapons found for this type.");
      return;
    }

    // Create keyboard for weapon names using utility
    const keyboard = KeyboardUtils.createWeaponNameKeyboard(weaponNames);

    await safeEditMessage(
      ctx,
      `🔍 Step-by-Step Item Search\n\n` +
        `Step 2: Choose item name\n\n` +
        `Type: ${weaponType}\n`,
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  }

  static async handleWeaponNameSelection(ctx: Context, weaponName: string) {
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
      step: "skin_name",
      weaponName,
    });

    // Get skin names for this weapon
    const skinNames = await SearchService.getSkinNames(weaponName);

    if (skinNames.length === 0) {
      // No skins available - this should only happen for knives
      if (session.weaponType?.toLowerCase() === "knife") {
        await this.handleNoSkins(ctx, session.weaponType!, weaponName);
      } else {
        await ctx.answerCbQuery(
          "❌ No skins found for this weapon. This might be a data issue."
        );
        await safeEditMessage(
          ctx,
          `❌ No skins found for ${weaponName}\n\n` +
            `This weapon doesn't have any skins in the database.\n` +
            `Please try another weapon or contact support.`,
          Markup.inlineKeyboard([
            [Markup.button.callback("🔄 Start Over", "search_restart")],
            [Markup.button.callback("❌ Cancel", "search_cancel")],
          ]).reply_markup
        );
      }
      return;
    }

    // Create keyboard for skin names using utility
    const keyboard = KeyboardUtils.createSkinNameKeyboard(skinNames);

    await safeEditMessage(
      ctx,
      `🔍 Step-by-Step Item Search\n\n` +
        `Step 3: Choose skin name\n\n` +
        `Type: ${session.weaponType}\n` +
        `Name: ${weaponName}\n`,
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  }

  static async handleSkinNameSelection(ctx: Context, skinName: string) {
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
      skinName,
    });

    // Create keyboard for skin conditions using utility
    const keyboard = KeyboardUtils.createConditionKeyboard([
      ...SKIN_CONDITIONS,
    ]);

    await safeEditMessage(
      ctx,
      `🔍 Step-by-Step Item Search\n\n` +
        `Step 4: Choose condition\n\n` +
        `Type: ${session.weaponType}\n` +
        `Name: ${session.weaponName}\n` +
        `Skin: ${skinName}\n` +
        `Available conditions:\n`,
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  }

  static async handleConditionSelection(ctx: Context, condition: string) {
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
      step: "category",
      condition: condition as any,
    });

    // Get available categories based on weapon type
    const categories = SearchService.getAvailableCategories(
      session.weaponType!
    );

    // Create keyboard for categories using utility
    const keyboard = KeyboardUtils.createCategoryKeyboard(categories);

    await safeEditMessage(
      ctx,
      `🔍 Step-by-Step Item Search\n\n` +
        `Step 5: Choose category\n\n` +
        `Type: ${session.weaponType}\n` +
        `Name: ${session.weaponName}\n` +
        `Skin: ${session.skinName}\n` +
        `Condition: ${condition}\n` +
        `Available categories:\n`,
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  }

  static async handleCategorySelection(ctx: Context, categoryId: string) {
    const user = ctx.from;
    if (!user) return;

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

    // Check if item exists in database and get item details
    const itemDetails = await SearchService.getItemDetails(
      session.weaponType!,
      session.weaponName!,
      session.skinName || null,
      session.condition!,
      category
    );

    if (!itemDetails) {
      // Get similar items for suggestions
      const similarItems = await SearchService.getSimilarItems(
        session.weaponName!,
        session.skinName || null
      );

      let message =
        `❌ Item not found in database\n\n` +
        `Generated name: ${finalName}\n\n`;

      if (similarItems.length > 0) {
        message +=
          `Similar items found:\n` +
          similarItems.map((item) => `• ${item}`).join("\n") +
          "\n\n";
      }

      message += `💡 Try searching manually or use /search again.`;

      await safeEditMessage(
        ctx,
        message,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Start Over", "search_restart")],
          [Markup.button.callback("❌ Cancel", "search_cancel")],
        ]).reply_markup
      );
      return;
    }

    // Update session with item details
    SearchService.updateSearchSession(user.id.toString(), {
      step: "complete",
      category,
      finalName: finalName, // Use the generated name with proper formatting
      itemId: itemDetails.id,
    });

    // Item found, show price check
    await safeEditMessage(
      ctx,
      `✅ Item found!\n\n` +
        `Generated name: ${finalName}\n\n` +
        `Click below to check the price:`,
      Markup.inlineKeyboard([
        [Markup.button.callback("💰 Check Price", "check_price_from_search")],
        [Markup.button.callback("🔄 Search Another", "search_restart")],
        [Markup.button.callback("❌ Cancel", "search_cancel")],
      ]).reply_markup
    );
  }

  static async handleNoSkins(
    ctx: Context,
    weaponType: string,
    weaponName: string
  ) {
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

    // Create keyboard for skin conditions using utility
    const keyboard = KeyboardUtils.createConditionKeyboard([
      ...SKIN_CONDITIONS,
    ]);

    await safeEditMessage(
      ctx,
      `🔍 Step-by-Step Item Search\n\n` +
        `Step 4: Choose skin condition\n\n` +
        `Type: ${weaponType}\n` +
        `Weapon: ${weaponName}\n` +
        `Skin: None (base weapon)\n` +
        `Available conditions:\n` +
        SKIN_CONDITIONS.map((condition) => `• ${condition}`).join("\n"),
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  }

  static async handleSearchRestart(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    // Check if we're already on the first step
    const currentMessage = (ctx.callbackQuery as any)?.message?.text;
    const isAlreadyOnFirstStep = currentMessage?.includes(
      "Step 1: Choose weapon type"
    );

    if (isAlreadyOnFirstStep) {
      // If we're already on the first step, just answer the callback query
      await ctx.answerCbQuery("🔄 Already on the first step!");
      return;
    }

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

    // Create inline keyboard for weapon types using utility
    const keyboard = KeyboardUtils.createWeaponTypeKeyboard(weaponTypes);

    await safeEditMessage(
      ctx,
      `🔍 Step-by-Step Item Search\n\n` + `Step 1: Choose weapon type\n\n`,
      Markup.inlineKeyboard(keyboard).reply_markup
    );
  }

  static async handleSearchCancel(ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    // Clear search session
    SearchService.clearSearchSession(user.id.toString());

    await safeEditMessage(
      ctx,
      "❌ Search cancelled.\n\nUse /search to start a new search or send an item name directly to check its price.",
      undefined
    );
  }
}
