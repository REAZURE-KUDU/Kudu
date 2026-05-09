const { getOrders, getOrderById, createOrder, updateOrderStatus } = require('../controllers/orderController');
//orderController.test.js
jest.mock('../models/Order');
jest.mock('../models/Vendor');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');

const mockRes = () => {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

// ─── getOrders ───────────────────────────────────────────────────────────────

describe('getOrders', () => {
  it('should return orders for a student', async () => {
    const fakeOrders = [{ _id: '1', status: 'pending' }];

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeOrders),
      }),
    });

    // FIX: controller reads req.user._id, not req.query.student
    const req = { user: { _id: 'student123' } };
    const res = mockRes();

    await getOrders(req, res);

    expect(Order.find).toHaveBeenCalledWith({ student: 'student123' });
    expect(res.json).toHaveBeenCalledWith(fakeOrders);
  });

  it('should return 500 on error', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });

    // FIX: controller reads req.user._id
    const req = { user: { _id: 'student123' } };
    const res = mockRes();

    await getOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});

// ─── getOrderById ─────────────────────────────────────────────────────────────

describe('getOrderById', () => {
  it('should return an order by ID', async () => {
    const fakeOrder = { _id: '1', status: 'pending' };

    Order.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(fakeOrder),
      }),
    });

    const req = { params: { id: '1' } };
    const res = mockRes();

    await getOrderById(req, res);

    expect(res.json).toHaveBeenCalledWith(fakeOrder);
  });

  it('should return 404 if order not found', async () => {
    Order.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    const req = { params: { id: 'nonexistent' } };
    const res = mockRes();

    await getOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Order not found' });
  });

  it('should return 500 on error', async () => {
    Order.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });

    const req = { params: { id: '1' } };
    const res = mockRes();

    await getOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});

// ─── createOrder ──────────────────────────────────────────────────────────────

describe('createOrder', () => {
  it('should create and return a new order', async () => {
    const fakeVendor = { _id: 'vendor123', status: 'active' };
    Vendor.findById = jest.fn().mockResolvedValue(fakeVendor);

    const fakeOrder = {
      _id: '1',
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
    };
    Order.mockImplementation(() => fakeOrder);

    // FIX: provide required fields (vendorId, items, totalAmount) and req.user._id
    const req = {
      user: { _id: 'student123' },
      body: {
        vendorId: 'vendor123',
        items: [{ menuItem: 'item1', name: 'Burger', price: 50, quantity: 1 }],
        totalAmount: 50,
      },
    };
    const res = mockRes();

    await createOrder(req, res);

    expect(fakeOrder.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    // FIX: controller returns { order } not the bare order object
    expect(res.json).toHaveBeenCalledWith({ order: fakeOrder });
  });

  it('should return 400 on error', async () => {
    const fakeVendor = { _id: 'vendor123', status: 'active' };
    Vendor.findById = jest.fn().mockResolvedValue(fakeVendor);

    const fakeOrder = { save: jest.fn().mockRejectedValue(new Error('Validation error')) };
    Order.mockImplementation(() => fakeOrder);

    // FIX: pass valid fields so it gets past the early validation check
    const req = {
      user: { _id: 'student123' },
      body: {
        vendorId: 'vendor123',
        items: [{ menuItem: 'item1', name: 'Burger', price: 50, quantity: 1 }],
        totalAmount: 50,
      },
    };
    const res = mockRes();

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Validation error' });
  });
});

// ─── updateOrderStatus ────────────────────────────────────────────────────────

describe('updateOrderStatus', () => {
  it('should update and return the order', async () => {
    const fakeOrder = { _id: '1', status: 'collected' };

    Order.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue(fakeOrder),
    });

    // FIX: 'completed' is not a valid status — use 'collected' from VALID_STATUSES
    const req = { params: { id: '1' }, body: { status: 'collected' } };
    const res = mockRes();

    await updateOrderStatus(req, res);

    expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      { status: 'collected' },
      { new: true }
    );
    expect(res.json).toHaveBeenCalledWith(fakeOrder);
  });

  it('should return 404 if order not found', async () => {
    Order.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    // FIX: use a valid status so it reaches findByIdAndUpdate
    const req = { params: { id: 'nonexistent' }, body: { status: 'collected' } };
    const res = mockRes();

    await updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Order not found' });
  });

  it('should return 500 on error', async () => {
    Order.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockRejectedValue(new Error('DB error')),
    });

    // FIX: use a valid status so it reaches findByIdAndUpdate
    const req = { params: { id: '1' }, body: { status: 'collected' } };
    const res = mockRes();

    await updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});