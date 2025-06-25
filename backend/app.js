require('dotenv').config()

const express = require('express')
const cors = require('cors')

const connectToDb = require('./databse/db')
// const addSuperAdmin = require('./controllers/add-superadmin')


const authRoutes = require('./routes/auth-routes')
const superAdminRoutes = require('./routes/superAdmin-routes')
const tripRoutes = require('./routes/trip-routes')
const userRoutes = require('./routes/user-routes')
const bookingRoutes = require('./routes/booking-routes')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth/',authRoutes);
app.use('/api/superAdmin',superAdminRoutes)
app.use('/api/trip',tripRoutes)
app.use('/api/users',userRoutes)
app.use('/api/booking',bookingRoutes)

const PORT = process.env.PORT


connectToDb()
// addSuperAdmin()
app.listen(PORT,()=>{
    console.log('Server is now listening')
})
