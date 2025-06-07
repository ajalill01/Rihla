const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    method: {
        type: String,
        enum: ['stripe', 'cash', 'bank_transfer', 'other'],
        required: true
    },

    stripePaymentId: String,
    stripeReceiptUrl: String,
    
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    receiptPhoto: String,
    
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    notes: String,
    currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP']
    },
    paymentDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);