const express = require('express');
const router = express.Router();
const {
    signUp,
    verifyEmail,
    resendVerification,
    login
} = require('../controllers/user-controllers');


router.post('/signup', signUp);
router.post('/verify/:tempToken', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);

module.exports = router;