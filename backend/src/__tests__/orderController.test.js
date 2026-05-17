const { getOrders, getOrderById, createOrder, updateOrderStatus, getVendorOrders, getAllOrders, getOrdersByStudent, getOrdersByVendor, } = require('../controllers/orderController');

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

// ─── getVendorOrders ──────────────────────────────────────────────────────────

describe('getVendorOrders', () => {
  it('should return all orders for a vendor', async () => {
    const fakeOrders = [{ _id: '1', status: 'pending' }];

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeOrders),
      }),
    });

    const req = { vendor: { _id: 'vendor123' }, query: {} };
    const res = mockRes();

    await getVendorOrders(req, res);

    expect(Order.find).toHaveBeenCalledWith({ vendor: 'vendor123' });
    expect(res.json).toHaveBeenCalledWith(fakeOrders);
  });

  it('should filter by status if provided', async () => {
    const fakeOrders = [{ _id: '1', status: 'ready' }];

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeOrders),
      }),
    });

    const req = { vendor: { _id: 'vendor123' }, query: { status: 'ready' } };
    const res = mockRes();

    await getVendorOrders(req, res);

    expect(Order.find).toHaveBeenCalledWith({ vendor: 'vendor123', status: 'ready' });
    expect(res.json).toHaveBeenCalledWith(fakeOrders);
  });

  it('should return 500 on error', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });

    const req = { vendor: { _id: 'vendor123' }, query: {} };
    const res = mockRes();

    await getVendorOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});

// ─── getAllOrders ─────────────────────────────────────────────────────────────

describe('getAllOrders', () => {
  it('should return all orders', async () => {
    const fakeOrders = [{ _id: '1' }, { _id: '2' }];

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(fakeOrders),
        }),
      }),
    });

    const req = {};
    const res = mockRes();

    await getAllOrders(req, res);

    expect(Order.find).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(fakeOrders);
  });

  it('should return 500 on error', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    });

    const req = {};
    const res = mockRes();

    await getAllOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});

// ─── getOrdersByStudent ───────────────────────────────────────────────────────

describe('getOrdersByStudent', () => {
  it('should return orders for a student', async () => {
    const fakeOrders = [{ _id: '1', status: 'pending' }];

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeOrders),
      }),
    });

    const req = { params: { studentId: 'student123' } };
    const res = mockRes();

    await getOrdersByStudent(req, res);

    expect(Order.find).toHaveBeenCalledWith({ student: 'student123' });
    expect(res.json).toHaveBeenCalledWith(fakeOrders);
  });

  it('should return 200 with message if no orders found', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    });

    const req = { params: { studentId: 'student123' } };
    const res = mockRes();

    await getOrdersByStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'This student has no orders.',
      orders: [],
    });
  });

  it('should return 500 on error', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });

    const req = { params: { studentId: 'student123' } };
    const res = mockRes();

    await getOrdersByStudent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});

// ─── getOrdersByVendor ────────────────────────────────────────────────────────

describe('getOrdersByVendor', () => {
  it('should return orders for a vendor', async () => {
    const fakeOrders = [{ _id: '1', status: 'pending' }];

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeOrders),
      }),
    });

    const req = { params: { vendorId: 'vendor123' } };
    const res = mockRes();

    await getOrdersByVendor(req, res);

    expect(Order.find).toHaveBeenCalledWith({ vendor: 'vendor123' });
    expect(res.json).toHaveBeenCalledWith(fakeOrders);
  });

  it('should return 200 with message if no orders found', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    });

    const req = { params: { vendorId: 'vendor123' } };
    const res = mockRes();

    await getOrdersByVendor(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'This vendor has no orders.',
      orders: [],
    });
  });

  it('should return 500 on error', async () => {
    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    });

    Order.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });

    const req = { params: { vendorId: 'vendor123' } };
    const res = mockRes();

    await getOrdersByVendor(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});

// ─── updateOrderStatus (additional branches) ──────────────────────────────────

describe('updateOrderStatus (additional branches)', () => {
  it('should set collectionCode when status is ready', async () => {
  const fakeOrder = { _id: '1', status: 'ready', collectionCode: '5678' };

  let capturedUpdate;
  Order.findByIdAndUpdate.mockImplementation((id, update, opts) => {
    capturedUpdate = update;
    return { populate: jest.fn().mockResolvedValue(fakeOrder) };
  });

  const req = { params: { id: '1' }, body: { status: 'ready' } };
  const res = mockRes();

  await updateOrderStatus(req, res);

  expect(capturedUpdate).toHaveProperty('collectionCode');
  expect(capturedUpdate.collectionCode).toMatch(/^\d{4}$/);
  expect(res.json).toHaveBeenCalledWith(fakeOrder);
});

it('should include estimatedReadyAt in update when provided', async () => {
  const fakeOrder = { _id: '1', status: 'preparing' };

  let capturedUpdate;
  Order.findByIdAndUpdate.mockImplementation((id, update, opts) => {
    capturedUpdate = update;
    return { populate: jest.fn().mockResolvedValue(fakeOrder) };
  });

  const req = {
    params: { id: '1' },
    body: { status: 'preparing', estimatedReadyAt: '2025-01-01T12:00:00Z' },
  };
  const res = mockRes();

  await updateOrderStatus(req, res);

  expect(capturedUpdate).toHaveProperty('estimatedReadyAt');
  expect(capturedUpdate.estimatedReadyAt).toBeInstanceOf(Date);
  expect(res.json).toHaveBeenCalledWith(fakeOrder);
});

  it('should return 400 for an invalid status', async () => {
    const req = { params: { id: '1' }, body: { status: 'completed' } };
    const res = mockRes();

    await updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid status. Must be one of: received, preparing, ready, collected, cancelled',
    });
  });
});