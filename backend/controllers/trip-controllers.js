const Trip = require('../models/Trip');
const { uploadToCloudinary } = require('../helpers/cloudinary-helpers');
const cloudinary = require('../config/cloudinary')
const fs = require('fs');

const cleanUpFiles = async (filePaths) => {
    for (const filePath of filePaths) {
        try {
            await fs.promises.unlink(filePath);
        } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err);
        }
    }
};

const createTrip = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one photo is required"
            });
        }
        const filePaths = files.map(file => file.path);

        try {
            const uploadedPhotos = await uploadToCloudinary(filePaths);

            let { 
                title,
                description,
                destination,
                itinerary,
                price,
                startDates,
                groupSize,
                accommodation,
                inclusions = [],
                exclusions = [],
                transportation,
                categories = [],
                duration
            } = req.body;

            title = title?.trim();
            description = description?.trim();
            destination = {
                country: destination?.country?.trim(),
                city: destination?.city?.trim()
            };
            accommodation = accommodation?.trim();
            transportation = transportation?.trim();
            categories = Array.isArray(categories) 
                ? categories.map(c => c?.trim()) 
                : JSON.parse(categories || '[]').map(c => c?.trim());

            const requiredFields = {
                title,
                description,
                'destination.country': destination?.country,
                'destination.city': destination?.city,
                'price.base': price?.base,
                'duration.days': duration?.days,
                'duration.nights': duration?.nights,
                'groupSize.max': groupSize?.max,
                accommodation,
                transportation
            };

            for (const [field, value] of Object.entries(requiredFields)) {
                if (!value) {
                    await cleanUpFiles(filePaths);
                    return res.status(400).json({
                        success: false,
                        message: `Missing required field: ${field}`
                    });
                }
            }

            const parsedItinerary = Array.isArray(itinerary) 
                ? itinerary 
                : JSON.parse(itinerary || '[]');

let parsedStartDates = [];
if (req.body.startDates) {
    if (typeof req.body.startDates === 'object' && !Array.isArray(req.body.startDates)) {

        parsedStartDates = Object.values(req.body.startDates);
    } else if (Array.isArray(req.body.startDates)) {
        parsedStartDates = req.body.startDates;
    } else {
        parsedStartDates = [req.body.startDates];
    }
    

    parsedStartDates = parsedStartDates
        .filter(date => date) 
        .map(date => {

            if (date instanceof Date) return date;

            if (typeof date === 'string' && date.trim() !== '') {
                return new Date(date.trim());
            }
            return null;
        })
        .filter(date => date && !isNaN(date.getTime()));
}


console.log('Parsed startDates:', parsedStartDates);
console.log('Type of dates:', parsedStartDates.map(d => typeof d));

if (parsedStartDates.length === 0) {
    await cleanUpFiles(filePaths);
    return res.status(400).json({
        success: false,
        message: "At least one valid start date is required"
    });
}

const tripData = {
    title,
    description,
    destination: {
        country: destination.country,
        city: destination.city
    },
    photos: uploadedPhotos,
    itinerary: parsedItinerary,
    price: {
        base: Number(price.base),
        discount: Number(price.discount) || 0
    },
    startDates: parsedStartDates,
    groupSize: {
        min: Math.max(1, parseInt(groupSize.min) || 1),
        max: Math.max(parseInt(groupSize.max), parseInt(groupSize.min) || 1)
    },
    accommodation,
    inclusions: Array.isArray(inclusions) ? inclusions : JSON.parse(inclusions || '[]'),
    exclusions: Array.isArray(exclusions) ? exclusions : JSON.parse(exclusions || '[]'),
    transportation,
    categories,
    duration: {
        days: Number(duration.days),
        nights: Number(duration.nights)
    }
};

console.log('Final groupSize values:', {
    min: tripData.groupSize.min,
    max: tripData.groupSize.max,
    types: {
        min: typeof tripData.groupSize.min,
        max: typeof tripData.groupSize.max
    }
});

const newTrip = new Trip(tripData);
await newTrip.save();

            await cleanUpFiles(filePaths);
            return res.status(201).json({
                success: true,
                message: 'Trip created successfully',
                trip: newTrip
            });

        } catch (uploadError) {
            await cleanUpFiles(filePaths);
            throw uploadError;
        }

    } catch (error) {
        console.error('Trip creation error:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${messages.join(', ')}`
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getActiveTrips = async (req, res) => {
    try {
        const {
            country,
            city,
            minPrice,
            maxPrice,
            minDuration,
            maxDuration,
            categories,
            accommodation,
            transportation,
            page = 1,
            limit = 10,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;


        const pageNumber = Math.max(1, parseInt(page)) || 1;
        const limitNumber = Math.min(100, Math.max(1, parseInt(limit))) || 10;

        const filter = { isActive: true };
        
        if (country) {
            filter['destination.country'] = new RegExp(country, 'i');
        }
        
        if (city) {
            filter['destination.city'] = new RegExp(city, 'i');
        }
        
        if (minPrice || maxPrice) {
            filter['price.base'] = {};
            if (minPrice) filter['price.base'].$gte = Number(minPrice);
            if (maxPrice) filter['price.base'].$lte = Number(maxPrice);
        }
        
        if (minDuration || maxDuration) {
            filter['duration.days'] = {};
            if (minDuration) filter['duration.days'].$gte = Number(minDuration);
            if (maxDuration) filter['duration.days'].$lte = Number(maxDuration);
        }
        
        if (categories) {
            const categoriesArray = Array.isArray(categories) 
                ? categories 
                : categories.split(',');
            filter.categories = { $in: categoriesArray.map(cat => cat.trim()) };
        }
        
        if (accommodation) {
            filter.accommodation = accommodation;
        }
        
        if (transportation) {
            filter.transportation = transportation;
        }

        const total = await Trip.countDocuments(filter);
        

        if (total === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: 0,
                    limit: limitNumber,
                    hasNextPage: false,
                    hasPreviousPage: false
                },
                data: []
            });
        }

        const totalPages = Math.ceil(total / limitNumber);
        const currentPage = Math.min(pageNumber, totalPages);
        const startIndex = Math.max(0, (currentPage - 1) * limitNumber);


        const sortOrder = order === 'desc' ? -1 : 1;
        const sortOptions = {};
        

        const allowedSortFields = ['title', 'price.base', 'duration.days', 'createdAt', 'rating.average'];
        if (allowedSortFields.includes(sort)) {
            sortOptions[sort] = sortOrder;
        } else {
            sortOptions.createdAt = -1;
        }


        const trips = await Trip.find(filter)
            .sort(sortOptions)
            .skip(startIndex)
            .limit(limitNumber)
            .lean();


        const tripsWithDiscount = trips.map(trip => ({
            ...trip,
            discountedPrice: parseFloat((trip.price.base * (1 - (trip.price.discount / 100))).toFixed(2)),
            hasDiscount: trip.price.discount > 0,
            startDates: trip.startDates.map(date => date.toISOString().split('T')[0])
        }));


        const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
        const queryParams = new URLSearchParams({ ...req.query, page: undefined });
        
        const pagination = {
            total,
            totalPages,
            currentPage,
            limit: limitNumber,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        };

        if (pagination.hasNextPage) {
            queryParams.set('page', currentPage + 1);
            pagination.next = `${baseUrl}?${queryParams.toString()}`;
        }

        if (pagination.hasPreviousPage) {
            queryParams.set('page', currentPage - 1);
            pagination.prev = `${baseUrl}?${queryParams.toString()}`;
        }


        const response = {
            success: true,
            count: trips.length,
            pagination,
            data: tripsWithDiscount
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getInactiveTrips = async (req, res) => {
    try {

        const {
            country,
            city,
            minPrice,
            maxPrice,
            minDuration,
            maxDuration,
            categories,
            accommodation,
            transportation,
            page = 1,
            limit = 10,
            sort = 'updatedAt',
            order = 'desc'
        } = req.query;


        const pageNumber = Math.max(1, parseInt(page) || 1);
        const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));


        const filter = { isActive: false };
        
        if (country) {
            filter['destination.country'] = new RegExp(country, 'i');
        }
        
        if (city) {
            filter['destination.city'] = new RegExp(city, 'i');
        }
        
        if (minPrice || maxPrice) {
            filter['price.base'] = {};
            if (minPrice) filter['price.base'].$gte = Number(minPrice);
            if (maxPrice) filter['price.base'].$lte = Number(maxPrice);
        }
        
        if (minDuration || maxDuration) {
            filter['duration.days'] = {};
            if (minDuration) filter['duration.days'].$gte = Number(minDuration);
            if (maxDuration) filter['duration.days'].$lte = Number(maxDuration);
        }
        
        if (categories) {
            const categoriesArray = Array.isArray(categories) 
                ? categories 
                : categories.split(',');
            filter.categories = { $in: categoriesArray.map(cat => cat.trim()) };
        }
        
        if (accommodation) {
            filter.accommodation = accommodation;
        }
        
        if (transportation) {
            filter.transportation = transportation;
        }


        const total = await Trip.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(total / limitNumber));
        const currentPage = Math.min(pageNumber, totalPages);
        const startIndex = Math.max(0, (currentPage - 1) * limitNumber);


        if (total === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: 0,
                    limit: limitNumber,
                    hasNextPage: false,
                    hasPreviousPage: false
                },
                data: []
            });
        }


        const sortOrder = order === 'desc' ? -1 : 1;
        const sortOptions = {};
        
        const allowedSortFields = [
            'title', 
            'price.base', 
            'duration.days', 
            'createdAt', 
            'updatedAt',
            'rating.average'
        ];
        
        if (allowedSortFields.includes(sort)) {
            sortOptions[sort] = sortOrder;
        } else {
            sortOptions.updatedAt = -1;
            sortOptions.createdAt = -1;
        }


        const trips = await Trip.find(filter)
            .sort(sortOptions)
            .skip(startIndex)
            .limit(limitNumber)
            .lean();


        const tripsWithDiscount = trips.map(trip => ({
            ...trip,
            discountedPrice: parseFloat((trip.price.base * (1 - (trip.price.discount / 100))).toFixed(2)),
            hasDiscount: trip.price.discount > 0,
            startDates: trip.startDates.map(date => date.toISOString().split('T')[0]),
            createdAt: trip.createdAt.toISOString(),
            updatedAt: trip.updatedAt.toISOString()
        }));

        const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/inactive`;
        const queryParams = new URLSearchParams({ ...req.query, page: undefined });
        
        const pagination = {
            total,
            totalPages,
            currentPage,
            limit: limitNumber,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
            sortField: sort,
            sortOrder: order
        };

        if (pagination.hasNextPage) {
            queryParams.set('page', currentPage + 1);
            pagination.next = `${baseUrl}?${queryParams.toString()}`;
        }

        if (pagination.hasPreviousPage) {
            queryParams.set('page', currentPage - 1);
            pagination.prev = `${baseUrl}?${queryParams.toString()}`;
        }

        const response = {
            success: true,
            count: trips.length,
            pagination,
            sorting: {
                field: sort,
                order,
                availableFields: allowedSortFields
            },
            data: tripsWithDiscount
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Error fetching inactive trips:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getTripById = async (req, res) => {
  try {
    const tripId = req.params.id;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    res.status(200).json({
      success: true,
      trip 
    });

  } catch (error) {
    console.log('Error from getTripById\n', error);
    res.status(500).json({
      success: false,
      message: 'Error while fetching trip',
      error: error.message
    });
  }
};

const activateTrip = async (req, res) => {
  try {
    const tripId = req.params.id;

    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { isActive: true },
      { new: true } 
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trip activated successfully',
      trip
    });

  } catch (error) {
    console.log('Error from activateTrip\n', error);
    res.status(500).json({
      success: false,
      message: 'Error while activating trip',
      error: error.message
    });
  }
};

const deactivateTrip = async (req, res) => {
  try {
    const tripId = req.params.id;

    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { isActive: false },
      { new: true } 
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trip deactivated successfully',
      trip
    });

  } catch (error) {
    console.log('Error from deactivateTrip\n', error);
    res.status(500).json({
      success: false,
      message: 'Error while deactivating trip',
      error: error.message
    });
  }
};

const updateTrip = async (req, res) => {
    try {
        const tripId = req.params.id;
        const updates = req.body;
        const files = req.files;


        if (files && files.length > 0) {
            const filePaths = files.map(file => file.path);
            try {
                const uploadedPhotos = await uploadToCloudinary(filePaths);
                updates.photos = uploadedPhotos;
                await cleanUpFiles(filePaths);
            } catch (uploadError) {
                await cleanUpFiles(filePaths);
                throw uploadError;
            }
        }


        if (updates.startDates) {
            updates.startDates = Array.isArray(updates.startDates) 
                ? updates.startDates.map(date => new Date(date))
                : [new Date(updates.startDates)];
        }


        if (updates.price) {
            if (updates.price.base) updates.price.base = Number(updates.price.base);
            if (updates.price.discount) updates.price.discount = Number(updates.price.discount);
        }

        if (updates.duration) {
            if (updates.duration.days) updates.duration.days = Number(updates.duration.days);
            if (updates.duration.nights) updates.duration.nights = Number(updates.duration.nights);
        }

        if (updates.groupSize) {
            if (updates.groupSize.min) updates.groupSize.min = Math.max(1, Number(updates.groupSize.min));
            if (updates.groupSize.max) updates.groupSize.max = Math.max(1, Number(updates.groupSize.max));
        }


        if (updates.title) updates.title = updates.title.trim();
        if (updates.description) updates.description = updates.description.trim();
        if (updates.destination) {
            if (updates.destination.country) updates.destination.country = updates.destination.country.trim();
            if (updates.destination.city) updates.destination.city = updates.destination.city.trim();
        }

        const updatedTrip = await Trip.findByIdAndUpdate(
            tripId,
            updates,
            { new: true, runValidators: true } 
        );

        if (!updatedTrip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Trip updated successfully',
            trip: updatedTrip
        });

    } catch (error) {
        console.error('Trip update error:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${messages.join(', ')}`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const deleteTrip = async (req, res) => {
    try {
        const tripId = req.params.id;
        
        const tripToDelete = await Trip.findById(tripId);
        
        if (!tripToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found',
                tripId: tripId
            });
        }

        if (tripToDelete.photos && tripToDelete.photos.length > 0) {
            const deleteResults = await Promise.all(
                tripToDelete.photos.map(photo => 
                    cloudinary.uploader.destroy(photo.publicId)
                )
            );
            
            console.log('Cloudinary deletion results:', deleteResults);
        }

        await Trip.findByIdAndDelete(tripId);
        
        res.status(200).json({
            success: true,
            message: 'Trip deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteTrip:', error);
        res.status(500).json({
            success: false,
            message: 'Error while deleting trip',
            error: error.message
        });
    }
};


module.exports = {
    createTrip,
    getActiveTrips,
    getInactiveTrips,
    getTripById,
    activateTrip,
    deactivateTrip,
    updateTrip,
    deleteTrip
};