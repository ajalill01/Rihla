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
        canManageContent: { type: Boolean, default: true },
        canManageAdmins: { type: Boolean, default: false }        
    },
        password : {
        type : String,
        trim : true,
        minlength : [8,'You should create a password of 8 characters or more'],
        select : false,
        required : [true,'Password is required']
    }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);