const express = require('express');
const router  = express.Router();
const { verifyToken, attachStudent } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

// Student requests PayFast form data for a confirmed order.
// Requires a valid JWT and attaches the student record before calling the controller.
router.post('/initiate', verifyToken, attachStudent, ctrl.initiatePayment);

// Receives the Instant Transaction Notification (ITN) posted directly from PayFast's servers
// after a payment completes. No JWT is used — PayFast authenticates via MD5 signature instead.
router.post('/notify', ctrl.handleNotify);

// Frontend polls this endpoint after PayFast redirects the student back to return_url.
// Requires a valid JWT to confirm the student owns the order before returning its status.
router.get('/verify/:orderId', verifyToken, attachStudent, ctrl.verifyPayment);

module.exports = router;
