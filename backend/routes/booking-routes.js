const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth-middleware');
const {
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking
} = require('../controllers/booking-controllers');


router.post('/create', authMiddleware, createBooking);
router.get('/user-bookings', authMiddleware, getUserBookings);
router.get('/:id', authMiddleware, getBookingDetails);
router.patch('/:id/cancel', authMiddleware, cancelBooking);

module.exports = router;