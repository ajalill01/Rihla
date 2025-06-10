const Booking = require('../models/Booking');
const { 
  calculateTotalPrice,
  validateParticipants,
  checkUserExists,
  checkTripAvailability
} = require('../helpers/booking-helpers');

// CREATE BOOKING
const createBooking = async (req, res) => {
  try {
    const { tripId, startDate, participants, specialRequests } = req.body;
    
    // Validate all required fields
    if (!tripId || !startDate || !participants) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: tripId, startDate, participants'
      });
    }

    // Validate participant structure
    try {
      validateParticipants(participants);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Check user exists
    await checkUserExists(req.user._id);

    // Check trip availability
    const trip = await checkTripAvailability(tripId, startDate);

    // Create booking
    const booking = new Booking({
      user: req.user._id,
      trip: tripId,
      startDate: new Date(startDate),
      participants,
      totalPrice: calculateTotalPrice(trip, participants),
      specialRequests: specialRequests || '',
      status: 'pending'
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        _id: booking._id,
        status: booking.status,
        startDate: booking.startDate,
        totalPrice: booking.totalPrice,
        trip: {
          _id: trip._id,
          title: trip.title
        }
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create booking'
    });
  }
};

// GET USER BOOKINGS
const getUserBookings = async (req, res) => {
  try {
    await checkUserExists(req.user._id);
    
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate({
        path: 'trip',
        select: 'title destination startDate endDate price images'
      })
      .select('-notes -__v')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: bookings.length,
      bookings 
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// GET BOOKING DETAILS
const getBookingDetails = async (req, res) => {
  try {
    await checkUserExists(req.user._id);
    
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    .populate({
      path: 'trip',
      select: 'title destination description price images'
    })
    .populate({
      path: 'payments',
      select: 'amount method status createdAt'
    })
    .select('-__v');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    res.json({ 
      success: true, 
      booking 
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      error: error.message
    });
  }
};

// CANCEL BOOKING
const cancelBooking = async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    
    // Validate cancellation reason
    if (!cancellationReason || cancellationReason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason must be at least 10 characters'
      });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        status: { $in: ['pending', 'confirmed'] }
      },
      {
        status: 'cancelled',
        cancellationReason,
        $push: { 
          notes: `Cancelled by user ${req.user._id} at ${new Date().toISOString()}` 
        }
      },
      { new: true }
    ).select('-__v -notes');

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled or not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking
};