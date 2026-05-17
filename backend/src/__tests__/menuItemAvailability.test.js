// menuItemAvailability.test.js
// Sprint 4 — US1 (Vendor Manages Menu Item Availability) & US2 (Student Views Real-Time Availability)

jest.mock("../models/MenuItem");
jest.mock("../models/Vendor");

const MenuItem = require("../models/MenuItem");
const {
  getMenuItems,
  getAllMenuItemsByVendor,
  toggleAvailability,
} = require("../controllers/menuItemController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Menu Item Availability", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── US1: Vendor Manages Menu Item Availability ───────────────────────────

  describe("toggleAvailability", () => {
    // UAT 1 — Mark item as sold out
    it("marks an available item as sold out", async () => {
      const fakeItem = {
        _id: "item123",
        vendor: "vendor123",
        isSoldOut: false,
        save: jest.fn().mockResolvedValue(true),
      };
      MenuItem.findById.mockResolvedValue(fakeItem);

      const req = {
        params: { id: "item123" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: true },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(fakeItem.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSoldOut: expect.any(Boolean) })
      );
    });

    // UAT 2 — Restore item to available
    it("restores a sold-out item to available", async () => {
      const fakeItem = {
        _id: "item123",
        vendor: "vendor123",
        isSoldOut: true,
        save: jest.fn().mockResolvedValue(true),
      };
      MenuItem.findById.mockResolvedValue(fakeItem);

      const req = {
        params: { id: "item123" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: false },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(fakeItem.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Availability updated" })
      );
    });

    // UAT 3 — Availability status persists (save is called on the item)
    it("calls save on the item to persist availability to the database", async () => {
      const fakeItem = {
        _id: "item123",
        vendor: "vendor123",
        isSoldOut: false,
        save: jest.fn().mockResolvedValue(true),
      };
      MenuItem.findById.mockResolvedValue(fakeItem);

      const req = {
        params: { id: "item123" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: true },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(fakeItem.save).toHaveBeenCalled();
    });

    // UAT 4 — Returns updated isSoldOut status
    it("returns the updated isSoldOut value in the response", async () => {
      const fakeItem = {
        _id: "item123",
        vendor: "vendor123",
        isSoldOut: false,
        save: jest.fn().mockResolvedValue(true),
      };
      MenuItem.findById.mockResolvedValue(fakeItem);

      const req = {
        params: { id: "item123" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: true },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSoldOut: expect.any(Boolean) })
      );
    });

    it("returns 404 if menu item is not found", async () => {
      MenuItem.findById.mockResolvedValue(null);

      const req = {
        params: { id: "item999" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: true },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    // UAT 5 — Vendor cannot toggle items they don't own
    it("returns 403 if vendor does not own the item", async () => {
      const fakeItem = {
        _id: "item123",
        vendor: "other-vendor",
        isSoldOut: false,
        save: jest.fn(),
      };
      MenuItem.findById.mockResolvedValue(fakeItem);

      const req = {
        params: { id: "item123" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: true },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "You do not own this menu item.",
      });
    });

    it("returns 500 on database error", async () => {
      MenuItem.findById.mockRejectedValue(new Error("DB error"));

      const req = {
        params: { id: "item123" },
        vendor: { _id: "vendor123" },
        body: { isSoldOut: true },
      };
      const res = mockRes();

      await toggleAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // ─── US2: Student Views Real-Time Item Availability ───────────────────────

  describe("getMenuItems (student-facing — available items only)", () => {
    // UAT 1 — Available items are returned
    it("returns only available items for a vendor", async () => {
      const items = [{ name: "Burger", isAvailable: true }];
      MenuItem.find.mockResolvedValue(items);

      const req = { query: { vendor: "vendor123" } };
      const res = mockRes();

      await getMenuItems(req, res);

      expect(MenuItem.find).toHaveBeenCalledWith({
        vendor: "vendor123",
        isAvailable: true,
      });
      expect(res.json).toHaveBeenCalledWith(items);
    });

    // UAT 5 — All items sold out: returns empty array
    it("returns an empty array when all items are sold out", async () => {
      MenuItem.find.mockResolvedValue([]);

      const req = { query: { vendor: "vendor123" } };
      const res = mockRes();

      await getMenuItems(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on database error", async () => {
      MenuItem.find.mockRejectedValue(new Error("DB error"));

      const req = { query: { vendor: "vendor123" } };
      const res = mockRes();

      await getMenuItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── US1 UAT 4 — Vendor dashboard shows both available and sold-out items ─

  describe("getAllMenuItemsByVendor (vendor dashboard)", () => {
    it("returns all items including sold-out ones for the vendor dashboard", async () => {
      const items = [
        { name: "Burger", isAvailable: true },
        { name: "Sold Out Wrap", isAvailable: false },
      ];
      MenuItem.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(items),
      });

      const req = { params: { vendorId: "vendor123" } };
      const res = mockRes();

      await getAllMenuItemsByVendor(req, res);

      expect(MenuItem.find).toHaveBeenCalledWith({ vendor: "vendor123" });
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("returns 500 on database error", async () => {
      MenuItem.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const req = { params: { vendorId: "vendor123" } };
      const res = mockRes();

      await getAllMenuItemsByVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });
});