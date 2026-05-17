// appealController.test.js
// Sprint 4 — US7 (Admin Reviews Appeals) & US8 (Suspended Vendor Submits Appeal)

jest.mock("../models/Appeal");
jest.mock("../models/Vendor");

const Appeal = require("../models/Appeal");
const Vendor = require("../models/Vendor");
const {
  submitAppeal,
  getAllAppeals,
  markReviewed,
  getVendorAppeal,
  reinstateVendor,
} = require("../controllers/appealController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Appeal Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── US8: Suspended Vendor Submits Appeal ─────────────────────────────────

  describe("submitAppeal", () => {
    // UAT 2 — Vendor can submit an appeal
    it("creates an appeal when vendor is suspended and message is provided", async () => {
      const fakeVendor = {
        _id: "vendor123",
        businessName: "The Krusty Krab",
        status: "suspended",
        email: "vendor@test.com",
      };
      Vendor.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeVendor) });
      Appeal.findOne = jest.fn().mockResolvedValue(null);
      Appeal.create = jest.fn().mockResolvedValue({
        _id: "appeal123",
        vendor: "vendor123",
        message: "I have resolved the issue.",
      });

      const req = {
        params: { vendorId: "vendor123" },
        body: { message: "I have resolved the issue." },
      };
      const res = mockRes();

      await submitAppeal(req, res);

      expect(Appeal.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Appeal submitted successfully." })
      );
    });

    it("returns 400 if message body is missing", async () => {
      const req = {
        params: { vendorId: "vendor123" },
        body: {},
      };
      const res = mockRes();

      await submitAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Appeal message is required.",
      });
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      const req = {
        params: { vendorId: "vendor999" },
        body: { message: "Some explanation." },
      };
      const res = mockRes();

      await submitAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Vendor not found." });
    });

    // UAT 1 — Only suspended vendors can submit
    it("returns 400 if vendor is not suspended", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "vendor123",
          businessName: "The Krusty Krab",
          status: "active",
        }),
      });
      Appeal.findOne = jest.fn().mockResolvedValue(null);

      const req = {
        params: { vendorId: "vendor123" },
        body: { message: "Some explanation." },
      };
      const res = mockRes();

      await submitAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Only suspended vendors can submit appeals.",
      });
    });

    it("returns 400 if vendor already has a pending appeal", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "vendor123",
          businessName: "The Krusty Krab",
          status: "suspended",
        }),
      });
      Appeal.findOne = jest.fn().mockResolvedValue({
        _id: "appeal123",
        status: "pending",
      });

      const req = {
        params: { vendorId: "vendor123" },
        body: { message: "Another appeal." },
      };
      const res = mockRes();

      await submitAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "You already have a pending appeal. We will be in touch soon.",
      });
    });

    it("returns 500 on database error", async () => {
      Vendor.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const req = {
        params: { vendorId: "vendor123" },
        body: { message: "Some explanation." },
      };
      const res = mockRes();

      await submitAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // ─── US7 (Admin): View All Appeals ───────────────────────────────────────

  describe("getAllAppeals", () => {
    // UAT A2 — Admin can view pending appeals
    it("returns all appeals", async () => {
      const appeals = [
        { _id: "appeal123", vendor: "vendor123", status: "pending" },
      ];

      Appeal.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(appeals),
        }),
      });

      const req = {};
      const res = mockRes();

      await getAllAppeals(req, res);

      expect(Appeal.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(appeals);
    });

    it("returns an empty array when no appeals exist", async () => {
      Appeal.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });

      const req = {};
      const res = mockRes();

      await getAllAppeals(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on database error", async () => {
      Appeal.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error("DB error")),
        }),
      });

      const req = {};
      const res = mockRes();

      await getAllAppeals(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // ─── US7 (Admin): Mark Appeal as Reviewed ────────────────────────────────

  describe("markReviewed", () => {
    // UAT A3 / A4 — Admin approves or rejects with feedback
    it("marks an appeal as reviewed with admin feedback", async () => {
      const updatedAppeal = {
        _id: "appeal123",
        status: "reviewed",
        adminNote: "Issue resolved.",
      };

      Appeal.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedAppeal);

      const req = {
        params: { id: "appeal123" },
        body: { adminNote: "Issue resolved." },
      };
      const res = mockRes();

      await markReviewed(req, res);

      expect(Appeal.findByIdAndUpdate).toHaveBeenCalledWith(
        "appeal123",
        expect.objectContaining({ adminNote: "Issue resolved." }),
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedAppeal);
    });

    it("returns 404 if appeal not found", async () => {
      Appeal.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const req = {
        params: { id: "appeal999" },
        body: { adminNote: "Some note." },
      };
      const res = mockRes();

      await markReviewed(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Appeal not found." });
    });

    it("returns 500 on database error", async () => {
      Appeal.findByIdAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const req = {
        params: { id: "appeal123" },
        body: { adminNote: "Some note." },
      };
      const res = mockRes();

      await markReviewed(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // ─── US8: Vendor Views Their Own Appeal ──────────────────────────────────

  describe("getVendorAppeal", () => {
    // UAT 3 — Vendor can see their appeal is under review
    it("returns the vendor's most recent appeal", async () => {
      const appeal = {
        _id: "appeal123",
        vendor: "vendor123",
        status: "pending",
      };

      Appeal.findOne = jest.fn().mockResolvedValue(appeal);

      const req = { params: { vendorId: "vendor123" } };
      const res = mockRes();

      await getVendorAppeal(req, res);

      expect(Appeal.findOne).toHaveBeenCalledWith({ vendor: "vendor123" });
      expect(res.json).toHaveBeenCalledWith(appeal);
    });

    it("returns 404 if no appeal found for vendor", async () => {
      Appeal.findOne = jest.fn().mockResolvedValue(null);

      const req = { params: { vendorId: "vendor999" } };
      const res = mockRes();

      await getVendorAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "No pending appeal found.",
      });
    });

    it("returns 500 on database error", async () => {
      Appeal.findOne = jest.fn().mockRejectedValue(new Error("DB error"));

      const req = { params: { vendorId: "vendor123" } };
      const res = mockRes();

      await getVendorAppeal(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // ─── US7 (Admin): Reinstate Vendor ───────────────────────────────────────

  describe("reinstateVendor", () => {
    // UAT A3 — Approving an appeal reactivates the vendor
    it("reinstates the vendor and sets their status to active", async () => {
      const updatedVendor = { _id: "vendor123", status: "active" };
      Vendor.findByIdAndUpdate.mockResolvedValue(updatedVendor);

      const req = { params: { vendorId: "vendor123" } };
      const res = mockRes();

      await reinstateVendor(req, res);

      expect(Vendor.findByIdAndUpdate).toHaveBeenCalledWith(
        "vendor123",
        expect.objectContaining({ status: "active" }),
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedVendor);
    });

    it("returns 404 if vendor not found", async () => {
      Vendor.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { vendorId: "vendor999" } };
      const res = mockRes();

      await reinstateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Vendor not found." });
    });

    it("returns 500 on database error", async () => {
      Vendor.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { vendorId: "vendor123" } };
      const res = mockRes();

      await reinstateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });
});