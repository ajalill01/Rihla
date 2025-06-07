const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    participants: {
        adults: { type: Number, required: true, min: 1 },
        children: { type: Number, default: 0 }
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid', 'refunded'],
        default: 'unpaid'
    },
    specialRequests: String,
    payments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }],
    amountPaid: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'cash', 'mixed'],
        default: 'stripe'
    }
}, { timestamps: true });

BookingSchema.index({ user: 1, status: 1 });
BookingSchema.index({ trip: 1, startDate: 1 });

BookingSchema.pre('save', function(next) {
  if (this.isModified('amountPaid') || this.isNew) {
    if (this.amountPaid > this.totalPrice) {
      return next(new Error('Payment amount cannot exceed total price'));
    }
    
    if (this.amountPaid >= this.totalPrice) {
      this.paymentStatus = 'paid';
    } else if (this.amountPaid > 0) {
      this.paymentStatus = 'partial';
    } else {
      this.paymentStatus = 'unpaid';
    }
  }
  next();
});


module.exports = mongoose.model('Booking', BookingSchema);