require('dotenv').config()

const express = require('express')
const cors = require('cors')

const connectToDb = require('./databse/db')


const app = express()

app.use(cors)
app.use(express.json())



const PORT = process.env.PORT


connectToDb()
app.listen(PORT,()=>{
    console.log('Server is now listening')
})
