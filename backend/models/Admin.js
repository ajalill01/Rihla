const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    email : {
            type : String,
            unique : true,
            trim : true,
            lowercase : true,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
            index : true,
            required : [true,'Email is required']
    },
    role: {
        type: String,
        enum: ['admin', 'superadmin'],
        default: 'admin'
    },
    permissions: {
        canManageTrips: { type: Boolean, default: true },
        canManageUsers: { type: Boolean, default: true },
        canManageBookings: { type: Boolean, default: true },
        canManageContent: { type: Boolean, default: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);