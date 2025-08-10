import {
  ITEM_CATEGORIES,
  SearchService,
  SKIN_CONDITIONS,
} from "../src/search-service";

describe("SearchService", () => {
  describe("generateItemName", () => {
    describe("Weapon name generation", () => {
      it("should generate normal weapon name correctly", () => {
        const result = SearchService.generateItemName(
          "Rifle",
          "AK-47",
          "Redline",
          "Field-Tested",
          "Normal"
        );
        expect(result).toBe("AK-47 | Redline (Field-Tested)");
      });

      it("should generate StatTrak™ weapon name correctly", () => {
        const result = SearchService.generateItemName(
          "Rifle",
          "AK-47",
          "Redline",
          "Field-Tested",
          "StatTrak™"
        );
        expect(result).toBe("StatTrak™ AK-47 | Redline (Field-Tested)");
      });

      it("should generate Souvenir weapon name correctly", () => {
        const result = SearchService.generateItemName(
          "Rifle",
          "AK-47",
          "Redline",
          "Field-Tested",
          "Souvenir"
        );
        expect(result).toBe("Souvenir AK-47 | Redline (Field-Tested)");
      });

      it("should handle all skin conditions for weapons", () => {
        SKIN_CONDITIONS.forEach((condition) => {
          const result = SearchService.generateItemName(
            "Rifle",
            "AK-47",
            "Redline",
            condition,
            "Normal"
          );
          expect(result).toBe(`AK-47 | Redline (${condition})`);
        });
      });
    });

    describe("Knife name generation", () => {
      it("should generate normal knife without skin correctly", () => {
        const result = SearchService.generateItemName(
          "Knife",
          "Bayonet",
          null,
          "Field-Tested",
          "Normal ★"
        );
        expect(result).toBe("★ Bayonet");
      });

      it("should generate StatTrak™ knife without skin correctly", () => {
        const result = SearchService.generateItemName(
          "Knife",
          "Bayonet",
          null,
          "Field-Tested",
          "★ StatTrak™"
        );
        expect(result).toBe("★ StatTrak™ Bayonet");
      });

      it("should generate normal knife with skin correctly", () => {
        const result = SearchService.generateItemName(
          "Knife",
          "Bayonet",
          "Bright Water",
          "Field-Tested",
          "Normal ★"
        );
        expect(result).toBe("★ Bayonet | Bright Water (Field-Tested)");
      });

      it("should generate StatTrak™ knife with skin correctly", () => {
        const result = SearchService.generateItemName(
          "Knife",
          "Bayonet",
          "Bright Water",
          "Field-Tested",
          "★ StatTrak™"
        );
        expect(result).toBe(
          "★ StatTrak™ Bayonet | Bright Water (Field-Tested)"
        );
      });

      it("should handle all skin conditions for knives", () => {
        SKIN_CONDITIONS.forEach((condition) => {
          const result = SearchService.generateItemName(
            "Knife",
            "Bayonet",
            "Bright Water",
            condition,
            "Normal ★"
          );
          expect(result).toBe(`★ Bayonet | Bright Water (${condition})`);
        });
      });
    });

    describe("Glove name generation", () => {
      it("should generate glove name correctly", () => {
        const result = SearchService.generateItemName(
          "Gloves",
          "Bloodhound Gloves",
          "Bronzed",
          "Field-Tested",
          "Normal ★"
        );
        expect(result).toBe("★ Bloodhound Gloves | Bronzed (Field-Tested)");
      });

      it("should handle all skin conditions for gloves", () => {
        SKIN_CONDITIONS.forEach((condition) => {
          const result = SearchService.generateItemName(
            "Gloves",
            "Bloodhound Gloves",
            "Bronzed",
            condition,
            "Normal ★"
          );
          expect(result).toBe(`★ Bloodhound Gloves | Bronzed (${condition})`);
        });
      });
    });

    describe("Edge cases", () => {
      it("should handle vanilla skin name for knives", () => {
        const result = SearchService.generateItemName(
          "Knife",
          "Bayonet",
          "Vanilla",
          "Field-Tested",
          "Normal ★"
        );
        expect(result).toBe("★ Bayonet");
      });

      it("should handle case insensitive weapon type matching", () => {
        const result1 = SearchService.generateItemName(
          "KNIFE",
          "Bayonet",
          "Bright Water",
          "Field-Tested",
          "Normal ★"
        );
        expect(result1).toBe("★ Bayonet | Bright Water (Field-Tested)");

        const result2 = SearchService.generateItemName(
          "Knife",
          "Bayonet",
          "Bright Water",
          "Field-Tested",
          "Normal ★"
        );
        expect(result2).toBe("★ Bayonet | Bright Water (Field-Tested)");
      });
    });
  });

  describe("getAvailableCategories", () => {
    it("should return weapon categories for rifle", () => {
      const result = SearchService.getAvailableCategories("Rifle");
      expect(result).toEqual(ITEM_CATEGORIES.WEAPON);
    });

    it("should return weapon categories for pistol", () => {
      const result = SearchService.getAvailableCategories("Pistol");
      expect(result).toEqual(ITEM_CATEGORIES.WEAPON);
    });

    it("should return knife categories for knife", () => {
      const result = SearchService.getAvailableCategories("Knife");
      expect(result).toEqual(ITEM_CATEGORIES.KNIFE);
    });

    it("should return knife categories for knife (case insensitive)", () => {
      const result = SearchService.getAvailableCategories("KNIFE");
      expect(result).toEqual(ITEM_CATEGORIES.KNIFE);
    });

    it("should return glove categories for gloves", () => {
      const result = SearchService.getAvailableCategories("Gloves");
      expect(result).toEqual(ITEM_CATEGORIES.GLOVES);
    });

    it("should return glove categories for gloves (case insensitive)", () => {
      const result = SearchService.getAvailableCategories("GLOVES");
      expect(result).toEqual(ITEM_CATEGORIES.GLOVES);
    });
  });

  describe("getSkinNames", () => {
    // Mock the adminSupabase for testing
    const mockAdminSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should add Vanilla option for knives with skins", async () => {
      // Mock data for a knife with skins
      const mockData = [
        { skin_name: "Bright Water", weapon_type: "Knife" },
        { skin_name: "Crimson Web", weapon_type: "Knife" },
      ];

      mockAdminSupabase.order.mockResolvedValue({
        data: mockData,
        error: null,
      });

      // Temporarily replace the adminSupabase import
      const originalAdminSupabase = require("../src/database").adminSupabase;
      require("../src/database").adminSupabase = mockAdminSupabase;

      const result = await SearchService.getSkinNames("Bayonet");

      expect(result).toContain("Vanilla");
      expect(result).toContain("Bright Water");
      expect(result).toContain("Crimson Web");

      // Restore original
      require("../src/database").adminSupabase = originalAdminSupabase;
    });

    it("should not add Vanilla for weapons", async () => {
      // Mock data for a weapon with skins
      const mockData = [
        { skin_name: "Redline", weapon_type: "Rifle" },
        { skin_name: "Vulcan", weapon_type: "Rifle" },
      ];

      mockAdminSupabase.order.mockResolvedValue({
        data: mockData,
        error: null,
      });

      // Temporarily replace the adminSupabase import
      const originalAdminSupabase = require("../src/database").adminSupabase;
      require("../src/database").adminSupabase = mockAdminSupabase;

      const result = await SearchService.getSkinNames("AK-47");

      expect(result).not.toContain("Vanilla");
      expect(result).toContain("Redline");
      expect(result).toContain("Vulcan");

      // Restore original
      require("../src/database").adminSupabase = originalAdminSupabase;
    });
  });

  describe("Search session management", () => {
    const testUserId = "test-user-123";

    beforeEach(() => {
      SearchService.clearSearchSession(testUserId);
    });

    it("should create new search session", () => {
      const session = SearchService.createSearchSession(testUserId);
      expect(session).toEqual({
        userId: testUserId,
        step: "weapon_type",
        timestamp: expect.any(Number),
      });
    });

    it("should get existing search session", () => {
      SearchService.createSearchSession(testUserId);
      const session = SearchService.getSearchSession(testUserId);
      expect(session).toBeTruthy();
      expect(session?.userId).toBe(testUserId);
    });

    it("should update search session", () => {
      SearchService.createSearchSession(testUserId);
      const updated = SearchService.updateSearchSession(testUserId, {
        step: "weapon_name",
        weaponType: "Rifle",
      });
      expect(updated?.step).toBe("weapon_name");
      expect(updated?.weaponType).toBe("Rifle");
    });

    it("should clear search session", () => {
      SearchService.createSearchSession(testUserId);
      SearchService.clearSearchSession(testUserId);
      const session = SearchService.getSearchSession(testUserId);
      expect(session).toBeNull();
    });

    it("should return null for non-existent session", () => {
      const session = SearchService.getSearchSession("non-existent");
      expect(session).toBeNull();
    });
  });

  describe("Constants validation", () => {
    it("should have correct skin conditions", () => {
      expect(SKIN_CONDITIONS).toEqual([
        "Factory New",
        "Minimal Wear",
        "Field-Tested",
        "Well-Worn",
        "Battle-Scarred",
      ]);
    });

    it("should have correct weapon categories", () => {
      expect(ITEM_CATEGORIES.WEAPON).toEqual([
        "Normal",
        "StatTrak™",
        "Souvenir",
      ]);
    });

    it("should have correct knife categories", () => {
      expect(ITEM_CATEGORIES.KNIFE).toEqual(["Normal ★", "★ StatTrak™"]);
    });

    it("should have correct glove categories", () => {
      expect(ITEM_CATEGORIES.GLOVES).toEqual(["Normal ★"]);
    });
  });
});

// Integration tests for complete search flow
describe("SearchService Integration", () => {
  describe("Complete search flow scenarios", () => {
    it("should handle complete weapon search flow", () => {
      // Step 1: Choose weapon type
      const weaponType = "Rifle";

      // Step 2: Choose weapon name
      const weaponName = "AK-47";

      // Step 3: Choose skin name
      const skinName = "Redline";

      // Step 4: Choose condition
      const condition = "Field-Tested";

      // Step 5: Choose category
      const category = "StatTrak™";

      // Final result
      const finalName = SearchService.generateItemName(
        weaponType,
        weaponName,
        skinName,
        condition,
        category
      );

      expect(finalName).toBe("StatTrak™ AK-47 | Redline (Field-Tested)");
    });

    it("should handle complete knife search flow", () => {
      // Step 1: Choose weapon type
      const weaponType = "Knife";

      // Step 2: Choose weapon name
      const weaponName = "Bayonet";

      // Step 3: Choose skin name
      const skinName = "Bright Water";

      // Step 4: Choose condition
      const condition = "Minimal Wear";

      // Step 5: Choose category
      const category = "★ StatTrak™";

      // Final result
      const finalName = SearchService.generateItemName(
        weaponType,
        weaponName,
        skinName,
        condition,
        category
      );

      expect(finalName).toBe(
        "★ StatTrak™ Bayonet | Bright Water (Minimal Wear)"
      );
    });

    it("should handle complete glove search flow", () => {
      // Step 1: Choose weapon type
      const weaponType = "Gloves";

      // Step 2: Choose weapon name
      const weaponName = "Bloodhound Gloves";

      // Step 3: Choose skin name
      const skinName = "Bronzed";

      // Step 4: Choose condition
      const condition = "Factory New";

      // Step 5: Choose category (only one option for gloves)
      const category = "Normal ★";

      // Final result
      const finalName = SearchService.generateItemName(
        weaponType,
        weaponName,
        skinName,
        condition,
        category
      );

      expect(finalName).toBe("★ Bloodhound Gloves | Bronzed (Factory New)");
    });

    it("should handle knife without skin", () => {
      const finalName = SearchService.generateItemName(
        "Knife",
        "Bayonet",
        null,
        "Field-Tested",
        "Normal ★"
      );

      expect(finalName).toBe("★ Bayonet");
    });
  });
});
