jest.mock("../models/Order");
jest.mock("crypto");

const crypto = require("crypto");
const Order = require("../models/Order");
const {
  initiatePayment,
  handleNotify,
  verifyPayment,
} = require("../controllers/paymentController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Mock crypto md5 hash
const mockDigest = jest.fn().mockReturnValue("mockedsignature");
const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
const mockCreateHash = jest.fn().mockReturnValue({ update: mockUpdate });
crypto.createHash = mockCreateHash;

describe("Payment Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    // restore createHash mock after each test
    crypto.createHash = mockCreateHash;
  });

  /* =======================
     initiatePayment
  ======================= */
  describe("initiatePayment", () => {
    const mockOrder = {
      _id: "order123",
      totalAmount: 100,
      status: "received",
      student: {
        _id: { toString: () => "student123" },
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
    };

    it("returns pfData and pfUrl for a valid order", async () => {
      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrder),
      });

      const req = {
        body: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await initiatePayment(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pfData: expect.objectContaining({ signature: "mockedsignature" }),
          pfUrl: expect.any(String),
        })
      );
    });

    it("returns 404 if order not found", async () => {
      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const req = {
        body: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
    });

    it("returns 403 if student does not own the order", async () => {
      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockOrder,
          student: {
            ...mockOrder.student,
            _id: { toString: () => "differentStudent" },
          },
        }),
      });

      const req = {
        body: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("returns 400 if order is already paid", async () => {
      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: "paid",
        }),
      });

      const req = {
        body: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Order already paid" });
    });

    it("returns 500 on server error", async () => {
      Order.findById.mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const req = {
        body: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  /* =======================
     handleNotify
  ======================= */
  describe("handleNotify", () => {
    it("returns 400 if signature is invalid", async () => {
      // digest returns something different from received sig
      mockDigest.mockReturnValueOnce("differentsignature");

      const req = {
        body: { signature: "invalidsignature", payment_status: "COMPLETE", m_payment_id: "order123" },
      };
      const res = mockRes();

      await handleNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Invalid signature");
    });

    it("marks order as paid on COMPLETE payment with valid signature", async () => {
      const save = jest.fn();
      Order.findById.mockResolvedValue({
        _id: "order123",
        status: "received",
        save,
      });

      const req = {
        body: {
          signature: "mockedsignature",
          payment_status: "COMPLETE",
          m_payment_id: "order123",
        },
      };
      const res = mockRes();

      await handleNotify(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("OK");
    });

    it("does not update order if already paid", async () => {
      const save = jest.fn();
      Order.findById.mockResolvedValue({
        _id: "order123",
        status: "paid",
        save,
      });

      const req = {
        body: {
          signature: "mockedsignature",
          payment_status: "COMPLETE",
          m_payment_id: "order123",
        },
      };
      const res = mockRes();

      await handleNotify(req, res);

      expect(save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("does nothing if payment_status is not COMPLETE", async () => {
      const req = {
        body: {
          signature: "mockedsignature",
          payment_status: "FAILED",
          m_payment_id: "order123",
        },
      };
      const res = mockRes();

      await handleNotify(req, res);

      expect(Order.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("OK");
    });

    it("returns 500 on server error", async () => {
      Order.findById.mockRejectedValue(new Error("DB error"));

      const req = {
        body: {
          signature: "mockedsignature",
          payment_status: "COMPLETE",
          m_payment_id: "order123",
        },
      };
      const res = mockRes();

      await handleNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Error");
    });
  });

  /* =======================
     verifyPayment
  ======================= */
  describe("verifyPayment", () => {
    it("returns order status if already paid", async () => {
      Order.findById.mockResolvedValue({
        _id: "order123",
        status: "paid",
        student: { toString: () => "student123" },
        save: jest.fn(),
      });

      const req = {
        params: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await verifyPayment(req, res);

      expect(res.json).toHaveBeenCalledWith({ status: "paid" });
    });

    it("promotes order from received to paid (ITN fallback)", async () => {
      const save = jest.fn();
      Order.findById.mockResolvedValue({
        _id: "order123",
        status: "received",
        student: { toString: () => "student123" },
        save,
      });

      const req = {
        params: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await verifyPayment(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ status: "paid" });
    });

    it("returns 404 if order not found", async () => {
      Order.findById.mockResolvedValue(null);

      const req = {
        params: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
    });

    it("returns 403 if student does not own the order", async () => {
      Order.findById.mockResolvedValue({
        _id: "order123",
        status: "received",
        student: { toString: () => "differentStudent" },
        save: jest.fn(),
      });

      const req = {
        params: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });

    it("returns 500 on server error", async () => {
      Order.findById.mockRejectedValue(new Error("DB error"));

      const req = {
        params: { orderId: "order123" },
        user: { _id: { toString: () => "student123" } },
      };
      const res = mockRes();

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });
});