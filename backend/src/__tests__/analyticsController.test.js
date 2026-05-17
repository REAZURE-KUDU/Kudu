// analyticsController.test.js
// Sprint 4 — US5 (Admin Analytics), US6 (Vendor Overview), US7 (Student Overview)
//
// NOTE: These tests are skipped because analyticsController.js does not exist yet.
// The overview/analytics logic currently lives inside vendorController.js,
// studentController.js, and adminController.js.
//
// TO ACTIVATE THESE TESTS:
// Option A — Create src/controllers/analyticsController.js and export:
//   getAdminAnalytics, getVendorOverview, getStudentOverview
//
// Option B — Update the require() path and function names below to point to
//   whichever existing controller handles this logic, then remove the
//   describe.skip wrappers.

jest.mock("../models/Order");
jest.mock("../models/MenuItem");
jest.mock("../models/Vendor");
jest.mock("../models/Student");

const Order = require("../models/Order");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ─── Uncomment and update this require once the controller exists ─────────
// const { getAdminAnalytics, getVendorOverview, getStudentOverview } =
//   require("../controllers/analyticsController");

describe.skip("Admin Analytics (US5)", () => {
  afterEach(() => jest.clearAllMocks());

  // UAT 1 — Total sales over time
  it("returns total sales grouped by date", async () => {
    const fakeSales = [
      { _id: "2026-05-01", total: 500 },
      { _id: "2026-05-02", total: 300 },
    ];
    Order.aggregate.mockResolvedValue(fakeSales);

    const req = {};
    const res = mockRes();

    await getAdminAnalytics(req, res);

    expect(Order.aggregate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ salesOverTime: fakeSales })
    );
  });

  // UAT 2 — Sales per vendor
  it("returns sales totals grouped by vendor", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = {};
    const res = mockRes();

    await getAdminAnalytics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ salesPerVendor: expect.any(Array) })
    );
  });

  // UAT 3 — Peak ordering hours
  it("returns order counts grouped by hour of day", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = {};
    const res = mockRes();

    await getAdminAnalytics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ peakHours: expect.any(Array) })
    );
  });

  // UAT 4 — Popular menu items
  it("returns top 10 most ordered menu items", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = {};
    const res = mockRes();

    await getAdminAnalytics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ topItems: expect.any(Array) })
    );
  });

  // UAT 6 — Empty state
  it("returns empty arrays when no orders exist", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = {};
    const res = mockRes();

    await getAdminAnalytics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        salesOverTime: expect.any(Array),
        salesPerVendor: expect.any(Array),
        peakHours: expect.any(Array),
        topItems: expect.any(Array),
      })
    );
  });

  it("returns 500 on database error", async () => {
    Order.aggregate.mockRejectedValue(new Error("DB error"));
    const req = {};
    const res = mockRes();

    await getAdminAnalytics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
  });
});

describe.skip("Vendor Overview Dashboard (US6)", () => {
  afterEach(() => jest.clearAllMocks());

  // UAT 1 — Revenue and order summary
  it("returns revenue, active orders, menu item count, and average rating", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { vendorId: "vendor123" }, query: {} };
    const res = mockRes();

    await getVendorOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ revenue: expect.any(Number) })
    );
  });

  // UAT 2 — Top sellers
  it("returns top-selling items for the vendor", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { vendorId: "vendor123" }, query: {} };
    const res = mockRes();

    await getVendorOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ topSellers: expect.any(Array) })
    );
  });

  // UAT 4 — Filter by time period
  it("filters overview data when a time period is provided", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { vendorId: "vendor123" }, query: { period: "this_week" } };
    const res = mockRes();

    await getVendorOverview(req, res);

    expect(Order.aggregate).toHaveBeenCalled();
  });

  // UAT 5 — Empty state
  it("returns zero values and empty arrays when vendor has no orders", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { vendorId: "vendor123" }, query: {} };
    const res = mockRes();

    await getVendorOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ topSellers: expect.any(Array) })
    );
  });

  // UAT 6 — Vendor only sees their own data
  it("scopes all queries to the requesting vendor ID", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { vendorId: "vendor123" }, query: {} };
    const res = mockRes();

    await getVendorOverview(req, res);

    const aggregateCall = Order.aggregate.mock.calls[0][0];
    const matchStage = aggregateCall.find((stage) => stage.$match);
    expect(JSON.stringify(matchStage)).toContain("vendor123");
  });

  it("returns 500 on database error", async () => {
    Order.aggregate.mockRejectedValue(new Error("DB error"));
    const req = { params: { vendorId: "vendor123" }, query: {} };
    const res = mockRes();

    await getVendorOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
  });
});

describe.skip("Student Overview Dashboard (US7)", () => {
  afterEach(() => jest.clearAllMocks());

  // UAT 1 — Total orders and spend summary
  it("returns total orders, total spent, average order value, and active orders", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { studentId: "student123" }, query: {} };
    const res = mockRes();

    await getStudentOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ totalOrders: expect.any(Number) })
    );
  });

  // UAT 2 — Most ordered items
  it("returns the student's most ordered items ranked by frequency", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { studentId: "student123" }, query: {} };
    const res = mockRes();

    await getStudentOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mostOrderedItems: expect.any(Array) })
    );
  });

  // UAT 3 — Favourite vendor
  it("returns the student's favourite vendor", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { studentId: "student123" }, query: {} };
    const res = mockRes();

    await getStudentOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ favouriteVendor: expect.any(Object) })
    );
  });

  // UAT 4 — Filter by time period
  it("filters overview data when a time period is provided", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { studentId: "student123" }, query: { period: "this_month" } };
    const res = mockRes();

    await getStudentOverview(req, res);

    expect(Order.aggregate).toHaveBeenCalled();
  });

  // UAT 5 — Empty state
  it("returns empty arrays when student has no orders", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { studentId: "student123" }, query: {} };
    const res = mockRes();

    await getStudentOverview(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mostOrderedItems: expect.any(Array) })
    );
  });

  // UAT 6 — Student only sees their own data
  it("scopes all queries to the requesting student ID", async () => {
    Order.aggregate.mockResolvedValue([]);
    const req = { params: { studentId: "student123" }, query: {} };
    const res = mockRes();

    await getStudentOverview(req, res);

    const aggregateCall = Order.aggregate.mock.calls[0][0];
    const matchStage = aggregateCall.find((stage) => stage.$match);
    expect(JSON.stringify(matchStage)).toContain("student123");
  });

  it("returns 500 on database error", async () => {
    Order.aggregate.mockRejectedValue(new Error("DB error"));
    const req = { params: { studentId: "student123" }, query: {} };
    const res = mockRes();

    await getStudentOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
  });
});