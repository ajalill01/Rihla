// helpers/booking-helpers.js
const User = require('../models/User');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');

exports.validateParticipants = (participants) => {
  if (!participants?.adults || participants.adults < 1) {
    throw new Error('At least one adult is required');
  }
  if (participants.children < 0) {
    throw new Error('Children count cannot be negative');
  }
};

exports.calculateTotalPrice = (trip, participants) => {
  // Validate inputs
  if (!trip?.price || typeof trip.price !== 'number') {
    throw new Error('Trip price is invalid or missing');
  }
  
  if (!participants?.adults || typeof participants.adults !== 'number') {
    throw new Error('Invalid participants data');
  }

  const adultPrice = trip.price;
  const childPrice = trip.childPrice || trip.price * 0.7; // Default 30% discount for kids
  
  return (
    (adultPrice * participants.adults) + 
    (childPrice * (participants.children || 0))
  );
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