const express =  require('express')
const router = express.Router()
const uploadMiddleware = require('../middleware/upload-middleware')

const authAdmin = require('../middleware/admin-auth')
const {createTrip,getActiveTrips,getInactiveTrips,getTripById,activateTrip,
    deactivateTrip,updateTrip,deleteTrip} = require('../controllers/trip-controllers')

router.post('/add-trip',authAdmin,uploadMiddleware,createTrip)
router.get('/get-acitve-trip',authAdmin,getActiveTrips)
router.get('/get-inacitve-trip',authAdmin,getInactiveTrips)
router.get('/get-by-id/:id',authAdmin,getTripById)
router.patch('/:id/activate',authAdmin,activateTrip);
router.patch('/:id/deactivate',authAdmin,deactivateTrip);
router.patch('/:id/update',authAdmin,uploadMiddleware,updateTrip);
router.delete('/:id/delete',authAdmin,deleteTrip);

module.exports = router