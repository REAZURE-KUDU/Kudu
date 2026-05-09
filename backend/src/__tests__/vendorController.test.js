jest.mock("../models/Vendor");

const Vendor = require("../models/Vendor");
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorProfile,
} = require("../controllers/vendorController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Vendor Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // getAllVendors
  describe("getAllVendors", () => {
    it("returns active vendors", async () => {
      const vendors = [{ businessName: "Test Vendor" }];
      Vendor.find.mockResolvedValue(vendors);

      const req = {};
      const res = mockRes();

      await getAllVendors(req, res);

      expect(Vendor.find).toHaveBeenCalledWith({ isActive: true });
      expect(res.json).toHaveBeenCalledWith(vendors);
    });

    it("handles server error", async () => {
      Vendor.find.mockRejectedValue(new Error("DB error"));

      const req = {};
      const res = mockRes();

      await getAllVendors(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // getVendorById
  describe("getVendorById", () => {
    it("returns vendor if found", async () => {
      const vendor = { businessName: "Vendor" };
      Vendor.findById.mockResolvedValue(vendor);

      const req = { params: { id: "123" } };
      const res = mockRes();

      await getVendorById(req, res);

      expect(res.json).toHaveBeenCalledWith(vendor);
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findById.mockResolvedValue(null);

      const req = { params: { id: "123" } };
      const res = mockRes();

      await getVendorById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles server error", async () => {
      Vendor.findById.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" } };
      const res = mockRes();

      await getVendorById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // createVendor
  describe("createVendor", () => {
    it("creates a vendor", async () => {
      const save = jest.fn();
      Vendor.mockImplementation(() => ({ save }));

      const req = { body: { businessName: "New Vendor" } };
      const res = mockRes();

      await createVendor(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles validation error", async () => {
      Vendor.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("Validation error")),
      }));

      const req = { body: {} };
      const res = mockRes();

      await createVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // updateVendor
  describe("updateVendor", () => {
    it("updates vendor", async () => {
      const vendor = { businessName: "Updated Vendor" };
      Vendor.findByIdAndUpdate.mockResolvedValue(vendor);

      const req = {
        params: { id: "123" },
        body: { businessName: "Updated Vendor" },
      };
      const res = mockRes();

      await updateVendor(req, res);

      expect(res.json).toHaveBeenCalledWith(vendor);
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles server error", async () => {
      Vendor.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // updateVendorProfile
  describe("updateVendorProfile", () => {
    it("updates allowed fields and logo", async () => {
      const vendor = { businessName: "Vendor" };
      Vendor.findByIdAndUpdate.mockResolvedValue(vendor);

      const req = {
        params: { id: "123" },
        body: { businessName: "Vendor", phone: "123" },
        file: {
          buffer: Buffer.from("test"),
          mimetype: "image/png",
        },
      };

      const res = mockRes();

      await updateVendorProfile(req, res);

      expect(Vendor.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(vendor);
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateVendorProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles server error", async () => {
      Vendor.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateVendorProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });
});