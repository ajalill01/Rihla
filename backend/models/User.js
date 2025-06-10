const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
        index: true,
        required: [true, 'Email is required']
    },
    favouriteTrips: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        validate: {
            validator: function(v) {
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: props => `${props.value} is not a valid trip ID!`
        }
    }],
    verification: {
        code: {
            type: String,
            select: false
        },
        expiresAt: {
            type: Date,
            select: false
        },
        attempts: {
            type: Number,
            default: 0,
            select: false
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    password: {
        type: String,
        trim: true,
        minlength: [8, 'You should create a password of 8 characters or more'],
        select: false,
        required: [true, 'Password is required']
    },
    profile: {
        firstName: String,
        lastName: String,
        phone: String,
        address: String,
        avatar: String
    },
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    accountLockedUntil: {
        type: Date,
        select: false
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add index for better performance on frequently queried fields
UserSchema.index({ email: 1, 'verification.isVerified': 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.profile?.firstName || ''} ${this.profile?.lastName || ''}`.trim();
});

module.exports = mongoose.model('User', UserSchema);