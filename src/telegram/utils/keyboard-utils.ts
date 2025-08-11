import { Markup } from "telegraf";

export class KeyboardUtils {
  /**
   * Creates a keyboard with items grouped into rows of specified size
   */
  static createGroupedKeyboard(
    items: string[],
    callbackPrefix: string,
    buttonsPerRow: number = 3,
    additionalButtons?: Array<{ text: string; callback: string }>
  ) {
    const keyboard = [];

    // Group items into rows
    for (let i = 0; i < items.length; i += buttonsPerRow) {
      const row = [];

      for (let j = 0; j < buttonsPerRow && i + j < items.length; j++) {
        row.push(
          Markup.button.callback(
            items[i + j],
            `${callbackPrefix}_${encodeURIComponent(items[i + j])}`
          )
        );
      }

      keyboard.push(row);
    }

    // Add additional buttons if provided
    if (additionalButtons && additionalButtons.length > 0) {
      const additionalRow = additionalButtons.map((button) =>
        Markup.button.callback(button.text, button.callback)
      );
      keyboard.push(additionalRow);
    }

    return keyboard;
  }

  /**
   * Creates a keyboard for weapon types with restart and cancel buttons
   */
  static createWeaponTypeKeyboard(
    weaponTypes: string[],
    includeRestart: boolean = true
  ) {
    const additionalButtons = [];

    if (includeRestart) {
      additionalButtons.push({
        text: "🔄 Restart",
        callback: "search_restart",
      });
    }
    additionalButtons.push({ text: "❌ Cancel", callback: "search_cancel" });

    return this.createGroupedKeyboard(
      weaponTypes,
      "search_type",
      3,
      additionalButtons
    );
  }

  /**
   * Creates a keyboard for weapon names with restart and cancel buttons
   */
  static createWeaponNameKeyboard(weaponNames: string[]) {
    // Limit to 20 to avoid Telegram limits
    const limitedNames = weaponNames.slice(0, 20);

    return this.createGroupedKeyboard(limitedNames, "search_weapon", 3, [
      { text: "🔄 Restart", callback: "search_restart" },
      { text: "❌ Cancel", callback: "search_cancel" },
    ]);
  }

  /**
   * Creates a keyboard for skin names with restart and cancel buttons
   */
  static createSkinNameKeyboard(skinNames: string[]) {
    return this.createGroupedKeyboard(skinNames, "search_skin", 3, [
      { text: "🔄 Restart", callback: "search_restart" },
      { text: "❌ Cancel", callback: "search_cancel" },
    ]);
  }

  /**
   * Creates a keyboard for skin conditions with restart and cancel buttons
   */
  static createConditionKeyboard(conditions: string[]) {
    return this.createGroupedKeyboard(conditions, "search_condition", 3, [
      { text: "🔄 Restart", callback: "search_restart" },
      { text: "❌ Cancel", callback: "search_cancel" },
    ]);
  }

  /**
   * Creates a keyboard for categories with restart and cancel buttons
   */
  static createCategoryKeyboard(categories: string[]) {
    const { CATEGORY_IDS } = require("../../constants");

    const keyboard = [];

    // Group categories into rows of 3 buttons each
    for (let i = 0; i < categories.length; i += 3) {
      const row = [];
      row.push(
        Markup.button.callback(
          categories[i],
          `search_category_${
            CATEGORY_IDS[categories[i] as keyof typeof CATEGORY_IDS]
          }`
        )
      );

      // Add second button to the row if available
      if (i + 1 < categories.length) {
        row.push(
          Markup.button.callback(
            categories[i + 1],
            `search_category_${
              CATEGORY_IDS[categories[i + 1] as keyof typeof CATEGORY_IDS]
            }`
          )
        );
      }

      // Add third button to the row if available
      if (i + 2 < categories.length) {
        row.push(
          Markup.button.callback(
            categories[i + 2],
            `search_category_${
              CATEGORY_IDS[categories[i + 2] as keyof typeof CATEGORY_IDS]
            }`
          )
        );
      }

      keyboard.push(row);
    }

    // Add restart and cancel buttons
    keyboard.push([
      Markup.button.callback("🔄 Restart", "search_restart"),
      Markup.button.callback("❌ Cancel", "search_cancel"),
    ]);

    return keyboard;
  }

  /**
   * Creates alert buttons keyboard
   */
  static createAlertButtonsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("📉 Drop alert", "ALERT_DROP"),
        Markup.button.callback("📈 Increase alert", "ALERT_INCREASE"),
        Markup.button.callback("🎯 Target alert", "ALERT_TARGET"),
      ],
    ]).reply_markup;
  }

  /**
   * Creates alert buttons keyboard with search options
   */
  static createAlertButtonsWithSearchKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("📉 Drop alert", "ALERT_DROP"),
        Markup.button.callback("📈 Increase alert", "ALERT_INCREASE"),
        Markup.button.callback("🎯 Target alert", "ALERT_TARGET"),
      ],
      [Markup.button.callback("🔄 Search Another", "search_restart")],
      [Markup.button.callback("❌ Close", "search_cancel")],
    ]).reply_markup;
  }
}
