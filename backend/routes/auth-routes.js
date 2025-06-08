const express = require('express')
const router = express.Router()

const {loginAdmin} = require('../controllers/auth-controllers')

router.post('/login-admin',loginAdmin);



module.exports = router