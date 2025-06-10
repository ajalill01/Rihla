// helpers/booking-helpers.js
const User = require('../models/User');
const Trip = require('../models/Trip');

exports.validateParticipants = (participants) => {
  if (!participants?.adults || participants.adults < 1) {
    throw new Error('At least one adult is required');
  }
  if (participants.children < 0) {
    throw new Error('Children count cannot be negative');
  }
};

exports.calculateTotalPrice = (trip, participants) => {
  return (trip.price * participants.adults) + 
         ((trip.childPrice || trip.price * 0.7) * (participants.children || 0));
};

exports.checkUserExists = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return user;
};

exports.checkTripAvailability = async (tripId, startDate) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new Error('Trip not found');
  
  const bookingsCount = await Booking.countDocuments({
    trip: tripId,
    startDate,
    status: { $nin: ['cancelled', 'completed'] }
  });
  
  if (bookingsCount >= (trip.capacity || 999)) {
    throw new Error('No available slots for selected date');
  }
  
  return trip;
};