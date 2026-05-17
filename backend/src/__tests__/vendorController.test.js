jest.mock("../models/Vendor");

const Vendor = require("../models/Vendor");
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorProfile,
  suspendVendor,
  reinstateVendor,
  requireNotSuspended,
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

// suspendVendor
  describe("suspendVendor", () => {
    it("suspends a vendor with a reason", async () => {
      const vendor = { businessName: "Vendor", status: "suspended" };
      Vendor.findByIdAndUpdate.mockResolvedValue(vendor);

      const req = { params: { id: "123" }, body: { reason: "Policy violation" } };
      const res = mockRes();

      await suspendVendor(req, res);

      expect(Vendor.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        {
          status: "suspended",
          statusReason: "Policy violation",
          suspendedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(vendor);
    });

    it("returns 400 if reason is missing", async () => {
      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await suspendVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "A suspension reason is required.",
      });
    });

    it("returns 400 if reason is blank", async () => {
      const req = { params: { id: "123" }, body: { reason: "   " } };
      const res = mockRes();

      await suspendVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "A suspension reason is required.",
      });
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: "123" }, body: { reason: "Policy violation" } };
      const res = mockRes();

      await suspendVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Vendor not found" });
    });

    it("handles server error", async () => {
      Vendor.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" }, body: { reason: "Policy violation" } };
      const res = mockRes();

      await suspendVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // reinstateVendor
  describe("reinstateVendor", () => {
    it("reinstates a vendor", async () => {
      const vendor = { businessName: "Vendor", status: "active" };
      Vendor.findByIdAndUpdate.mockResolvedValue(vendor);

      const req = { params: { id: "123" } };
      const res = mockRes();

      await reinstateVendor(req, res);

      expect(Vendor.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { status: "active", statusReason: "", suspendedAt: null },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(vendor);
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: "123" } };
      const res = mockRes();

      await reinstateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Vendor not found" });
    });

    it("handles server error", async () => {
      Vendor.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" } };
      const res = mockRes();

      await reinstateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // requireNotSuspended
  describe("requireNotSuspended", () => {
    it("calls next() if no vendorId is present", async () => {
      const req = { params: {}, query: {}, body: {} };
      const res = mockRes();
      const next = jest.fn();

      await requireNotSuspended(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("calls next() if vendor is active", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ status: "active" }),
      });

      const req = { params: { id: "123" }, query: {}, body: {} };
      const res = mockRes();
      const next = jest.fn();

      await requireNotSuspended(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 403 if vendor is suspended", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ status: "suspended" }),
      });

      const req = { params: { id: "123" }, query: {}, body: {} };
      const res = mockRes();
      const next = jest.fn();

      await requireNotSuspended(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Your account has been suspended. Please contact support.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = { params: { id: "123" }, query: {}, body: {} };
      const res = mockRes();
      const next = jest.fn();

      await requireNotSuspended(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Vendor not found" });
    });

    it("handles server error", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const req = { params: { id: "123" }, query: {}, body: {} };
      const res = mockRes();
      const next = jest.fn();

      await requireNotSuspended(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });