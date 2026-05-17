// menuItemAllergens.test.js
// Sprint 4 — US3 (Vendor Tags Menu Items) & US4 (Student Filters by Allergen/Dietary Info)

jest.mock("../models/MenuItem");

const MenuItem = require("../models/MenuItem");
const {
  createMenuItem,
  updateMenuItem,
  getMenuItems,
  getMenuItemById,
  getAllMenuItemsByVendor,
} = require("../controllers/menuItemController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Menu Item Allergen & Dietary Tags", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {};
    res = mockRes();
    jest.clearAllMocks();
  });

  // ─── US3: Vendor Tags Menu Items ──────────────────────────────────────────

  describe("createMenuItem — with allergen and dietary tags", () => {
    // UAT 1 — Vendor can assign dietary labels
    it("creates a menu item with dietary labels", async () => {
      req.body = {
        vendor: "vendor123",
        name: "Veggie Wrap",
        dietaryLabels: ["Vegan", "Gluten-Free"],
        allergens: [],
      };

      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.prototype.save = jest.fn().mockResolvedValue(req.body);

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    // UAT 2 — Vendor can assign allergen warnings
    it("creates a menu item with allergen warnings", async () => {
      req.body = {
        vendor: "vendor123",
        name: "Peanut Burger",
        dietaryLabels: [],
        allergens: ["Contains Nuts", "Contains Gluten"],
      };

      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.prototype.save = jest.fn().mockResolvedValue(req.body);

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    // UAT 5 — Item saved with no tags still saves successfully
    it("creates a menu item with no dietary or allergen tags", async () => {
      req.body = {
        vendor: "vendor123",
        name: "Mystery Burger",
        dietaryLabels: [],
        allergens: [],
      };

      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.prototype.save = jest.fn().mockResolvedValue(req.body);

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 409 if duplicate item name exists", async () => {
      req.body = { vendor: "vendor123", name: "Veggie Wrap" };
      MenuItem.findOne.mockResolvedValue({ name: "veggie wrap" });

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 500 on database error", async () => {
      req.body = { vendor: "vendor123", name: "Burger" };
      MenuItem.findOne.mockRejectedValue(new Error("DB error"));

      await createMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateMenuItem — allergen and dietary tags", () => {
    // UAT 4 — Vendor can update tags on existing item
    it("updates dietary labels on an existing menu item", async () => {
      req.params = { id: "item123" };
      req.body = { dietaryLabels: ["Halal", "Dairy-Free"] };

      MenuItem.findById.mockResolvedValue({ vendor: "vendor123" });
      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.findByIdAndUpdate.mockResolvedValue({
        _id: "item123",
        dietaryLabels: ["Halal", "Dairy-Free"],
      });

      await updateMenuItem(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ dietaryLabels: ["Halal", "Dairy-Free"] })
      );
    });

    it("updates allergen warnings on an existing menu item", async () => {
      req.params = { id: "item123" };
      req.body = { allergens: ["Contains Dairy", "Contains Eggs"] };

      MenuItem.findById.mockResolvedValue({ vendor: "vendor123" });
      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.findByIdAndUpdate.mockResolvedValue({
        _id: "item123",
        allergens: ["Contains Dairy", "Contains Eggs"],
      });

      await updateMenuItem(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ allergens: ["Contains Dairy", "Contains Eggs"] })
      );
    });

    // UAT 3 — Tags are saved and reflected back
    it("returns the updated item with saved tags", async () => {
      req.params = { id: "item123" };
      req.body = { dietaryLabels: ["Vegetarian"], allergens: ["Contains Gluten"] };

      MenuItem.findById.mockResolvedValue({ vendor: "vendor123" });
      MenuItem.findOne.mockResolvedValue(null);
      MenuItem.findByIdAndUpdate.mockResolvedValue({
        _id: "item123",
        dietaryLabels: ["Vegetarian"],
        allergens: ["Contains Gluten"],
      });

      await updateMenuItem(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          dietaryLabels: ["Vegetarian"],
          allergens: ["Contains Gluten"],
        })
      );
    });

    it("returns 404 if item not found", async () => {
      req.params = { id: "item999" };
      req.body = { dietaryLabels: ["Vegan"] };
      MenuItem.findById.mockResolvedValue(null);

      await updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on database error", async () => {
      req.params = { id: "item123" };
      req.body = { dietaryLabels: ["Vegan"] };
      MenuItem.findById.mockRejectedValue(new Error("DB error"));

      await updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── US4: Student Filters and Views Allergen & Dietary Info ──────────────

  describe("getMenuItems — dietary filter (student-facing)", () => {
    // UAT 1 — Tags visible on menu items
    it("returns items with their dietary labels and allergens", async () => {
      const items = [
        {
          name: "Veggie Wrap",
          isAvailable: true,
          dietaryLabels: ["Vegan"],
          allergens: [],
        },
      ];
      MenuItem.find.mockResolvedValue(items);

      req.query = { vendor: "vendor123" };

      await getMenuItems(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ dietaryLabels: ["Vegan"] }),
        ])
      );
    });

    // UAT 2 — Student filters by dietary preference
    it("returns only items matching a dietary filter", async () => {
      const halalItems = [
        { name: "Chicken Roll", isAvailable: true, dietaryLabels: ["Halal"] },
      ];
      MenuItem.find.mockResolvedValue(halalItems);

      req.query = { vendor: "vendor123", dietaryLabel: "Halal" };

      await getMenuItems(req, res);

      expect(MenuItem.find).toHaveBeenCalledWith(
        expect.objectContaining({ dietaryLabels: "Halal" })
      );
      expect(res.json).toHaveBeenCalledWith(halalItems);
    });

    // UAT 5 — Empty state when no items match filter
    it("returns an empty array when no items match the dietary filter", async () => {
      MenuItem.find.mockResolvedValue([]);

      req.query = { vendor: "vendor123", dietaryLabel: "Vegan" };

      await getMenuItems(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on database error", async () => {
      MenuItem.find.mockRejectedValue(new Error("DB error"));

      req.query = { vendor: "vendor123" };

      await getMenuItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getMenuItemById — full allergen detail view", () => {
    // UAT 4 — Student can view full allergen detail on an item
    it("returns full allergen and dietary detail for a single item", async () => {
      const item = {
        _id: "item123",
        name: "Peanut Burger",
        dietaryLabels: ["Halal"],
        allergens: ["Contains Nuts", "Contains Gluten"],
      };
      MenuItem.findById.mockResolvedValue(item);

      req.params = { id: "item123" };

      await getMenuItemById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          dietaryLabels: ["Halal"],
          allergens: ["Contains Nuts", "Contains Gluten"],
        })
      );
    });

    // UAT 3 — Items with no allergen info are clearly indicated
    it("returns item with empty allergen and dietary arrays when none are set", async () => {
      const item = {
        _id: "item123",
        name: "Mystery Burger",
        dietaryLabels: [],
        allergens: [],
      };
      MenuItem.findById.mockResolvedValue(item);

      req.params = { id: "item123" };

      await getMenuItemById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ dietaryLabels: [], allergens: [] })
      );
    });

    it("returns 404 if item not found", async () => {
      MenuItem.findById.mockResolvedValue(null);

      req.params = { id: "item999" };

      await getMenuItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    it("returns 500 on database error", async () => {
      MenuItem.findById.mockRejectedValue(new Error("DB error"));

      req.params = { id: "item123" };

      await getMenuItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
