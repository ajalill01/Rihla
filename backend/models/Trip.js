const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        maxlength: [30, 'Title cannot be more than 30 characters'],
        required: [true, 'Title is required'],
        index: true
    },
    description: {
        type: String,
        maxlength: [100, 'Description cannot be more than 100 characters'],
        required: [true, 'Description is required']
    },
    destination: {
        country: {
            type: String,
            required: true,
            index: true
        },
        city: {
            type: String,
            required: true,
            index: true
        }
    },
    photos: [{
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        }
    }],
    itinerary: [{
        day: {
            type: Number,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: String,
        activities: [String]
    }],
    price: {
        base: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative']
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%']
        }
    },
    startDates: [{
        type: Date,
        required: true,
        validate: {
            validator: function(date) {
                return date > new Date();
            },
            message: 'Start date must be in the future'
        }
    }],
    groupSize: {
        max: {
            type: Number,
            required: true,
            min: [1, 'Maximum group size must be at least 1']
        },
        min: {
            type: Number,
            default: 1,
            min: [1, 'Minimum group size must be at least 1']
        },
        validate: {
            validator: function(value) {
                return value.max >= value.min;
            },
            message: 'Max group size must be greater than or equal to min size'
        }
    },
    accommodation: {
        type: String,
        enum: ['hotel', 'hostel', 'resort', 'camping', 'cruise'],
        required: true
    },
    inclusions: {
        type: [String],
        default: []
    },
    exclusions: {
        type: [String],
        default: []
    },
    transportation: {
        type: String,
        enum: ['flight', 'bus', 'train', 'self-drive', 'cruise'],
        required: true
    },
    categories: {
        type: [String],
        enum: ['adventure', 'beach', 'family', 'honeymoon', 'cultural', 'luxury'],
        default: []
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: [0, 'Rating cannot be less than 0'],
            max: [5, 'Rating cannot exceed 5']
        },
        count: {
            type: Number,
            default: 0,
            min: [0, 'Rating count cannot be negative']
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    duration: {
        days: {
            type: Number,
            required: true,
            min: [1, 'Duration must be at least 1 day']
        },
        nights: {
            type: Number,
            required: true,
            min: [0, 'Nights cannot be negative']
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true, 
});

TripSchema.index({ destination: 1, isActive: 1 });
TripSchema.index({ price: 1, duration: 1 });
TripSchema.index({ 'destination.country': 1, 'destination.city': 1, isActive: 1 });

TripSchema.virtual('discountedPrice').get(function() {
    const discountAmount = this.price.base * (this.price.discount / 100);
    return parseFloat((this.price.base - discountAmount).toFixed(2));
});

TripSchema.virtual('duration.weeks').get(function() {
    return Math.floor(this.duration.days / 7);
});

TripSchema.virtual('hasDiscount').get(function() {
    return this.price.discount > 0;
});

TripSchema.pre('save', function(next) {
    if (this.startDates && this.startDates.length) {
        const now = new Date();
        this.startDates = this.startDates.filter(date => date > now);
        
        if (this.startDates.length === 0) {
            return next(new Error('At least one valid future start date is required'));
        }
    }
    next();
});


module.exports = mongoose.model('Trip', TripSchema);