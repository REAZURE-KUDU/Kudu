const { submitReview, getVendorReviews, getReviewByOrder } = require('../controllers/reviewController');

jest.mock('../models/Review');
jest.mock('../models/Order');

const Review = require('../models/Review');
const Order  = require('../models/Order');

const mockRes = () => {
  const res = {};
  res.json   = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

// ─── submitReview ─────────────────────────────────────────────────────────────

describe('submitReview', () => {
  const baseReq = {
    user: { _id: 'student123' },
    body: { orderId: 'order123', rating: 5, comment: 'Great food!' },
  };

  it('should return 404 if order not found', async () => {
    Order.findById = jest.fn().mockResolvedValue(null);

    const res = mockRes();
    await submitReview(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Order not found' });
  });

  it('should return 403 if order does not belong to student', async () => {
    Order.findById = jest.fn().mockResolvedValue({
      _id:     'order123',
      student: 'differentStudent',
      status:  'collected',
      vendor:  'vendor123',
    });

    const res = mockRes();
    await submitReview(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not your order' });
  });

  it('should return 400 if order has not been collected yet', async () => {
    Order.findById = jest.fn().mockResolvedValue({
      _id:     'order123',
      student: 'student123',
      status:  'preparing',
      vendor:  'vendor123',
    });

    const res = mockRes();
    await submitReview(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Reviews can only be submitted once an order has been collected',
    });
  });

  it('should return 400 if order has already been reviewed', async () => {
    Order.findById = jest.fn().mockResolvedValue({
      _id:     'order123',
      student: 'student123',
      status:  'collected',
      vendor:  'vendor123',
    });
    Review.findOne = jest.fn().mockResolvedValue({ _id: 'existingReview' });

    const res = mockRes();
    await submitReview(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'You have already reviewed this order' });
    });

    it('should create and return a review for a collected order', async () => {
    Order.findById = jest.fn().mockResolvedValue({
        _id:     'order123',
        student: 'student123',
        status:  'collected',
        vendor:  'vendor123',
    });
    Review.findOne  = jest.fn().mockResolvedValue(null);

    const fakeReview = {
        _id:     'review123',
        order:   'order123',
        student: 'student123',
        vendor:  'vendor123',
        rating:  5,
        comment: 'Great food!',
    };
    Review.create = jest.fn().mockResolvedValue(fakeReview);

    const res = mockRes();
    await submitReview(baseReq, res);

    expect(Review.create).toHaveBeenCalledWith({
        order:   'order123',
        student: 'student123',
        vendor:  'vendor123',
        rating:  5,
        comment: 'Great food!',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeReview);
        });

    it('should return 500 on unexpected error', async () => {
    Order.findById = jest.fn().mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await submitReview(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });
});

// ─── getVendorReviews ─────────────────────────────────────────────────────────

describe('getVendorReviews', () => {
    it('should return reviews for a vendor', async () => {
    const fakeReviews = [
        { _id: 'r1', rating: 5, comment: 'Excellent!' },
        { _id: 'r2', rating: 4, comment: 'Pretty good' },
    ];

    Review.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeReviews),
        }),
    });

    const req = { params: { vendorId: 'vendor123' } };
    const res = mockRes();

    await getVendorReviews(req, res);

    expect(Review.find).toHaveBeenCalledWith({ vendor: 'vendor123' });
    expect(res.json).toHaveBeenCalledWith(fakeReviews);
    });

    it('should return empty array if vendor has no reviews', async () => {
    Review.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
        }),
    });

    const req = { params: { vendorId: 'vendor123' } };
    const res = mockRes();

    await getVendorReviews(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 on error', async () => {
    Review.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
    });

    const req = { params: { vendorId: 'vendor123' } };
    const res = mockRes();

    await getVendorReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });
});

// ─── getReviewByOrder ─────────────────────────────────────────────────────────

describe('getReviewByOrder', () => {
    it('should return the review for a given order', async () => {
    const fakeReview = { _id: 'review123', rating: 5, comment: 'Great food!' };
    Review.findOne = jest.fn().mockResolvedValue(fakeReview);

    const req = { params: { orderId: 'order123' } };
    const res = mockRes();

    await getReviewByOrder(req, res);

    expect(Review.findOne).toHaveBeenCalledWith({ order: 'order123' });
    expect(res.json).toHaveBeenCalledWith(fakeReview);
    });

    it('should return null if no review exists for the order', async () => {
    Review.findOne = jest.fn().mockResolvedValue(null);

    const req = { params: { orderId: 'order123' } };
    const res = mockRes();

    await getReviewByOrder(req, res);

    expect(res.json).toHaveBeenCalledWith(null);
    });

    it('should return 500 on error', async () => {
    Review.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

    const req = { params: { orderId: 'order123' } };
    const res = mockRes();

    await getReviewByOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });
});