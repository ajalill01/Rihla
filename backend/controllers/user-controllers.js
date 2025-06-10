const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../helpers/email-helper');

const signUp = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already in use'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

        const newUser = new User({
            email,
            password: hashedPassword,
            verification: {
                code: verificationCode,
                expiresAt: verificationExpires,
                isVerified: false
            }
        });

        await newUser.save();

        await sendEmail({
            to: email,
            subject: 'Verify Your Email',
            html: `
                <h2>Welcome to our Travel Platform!</h2>
                <p>Your verification code is: <strong>${verificationCode}</strong></p>
                <p>This code will expire in 30 minutes.</p>
            `
        });

        const tempToken = jwt.sign(
            { userId: newUser._id, purpose: 'email_verification' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully. Please verify your email.',
            tempToken,
            userId: newUser._id
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;
        const { tempToken } = req.params;

        if (!code || !tempToken) {
            return res.status(400).json({
                success: false,
                message: 'Verification code and token are required'
            });
        }

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (decoded.purpose !== 'email_verification') {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }

        const user = await User.findOne({
            _id: decoded.userId,
            'verification.code': code,
            'verification.expiresAt': { $gt: new Date() }
        }).select('+verification.code +verification.expiresAt');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        user.verification.isVerified = true;
        user.verification.code = undefined;
        user.verification.expiresAt = undefined;
        await user.save();

        const authToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            token: authToken,
            user: {
                _id: user._id,
                email: user.email,
                isVerified: true
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email }).select('+verification.code +verification.expiresAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.verification.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            });
        }

        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

        user.verification.code = verificationCode;
        user.verification.expiresAt = verificationExpires;
        user.verification.attempts += 1;
        await user.save();

        await sendEmail({
            to: email,
            subject: 'New Verification Code',
            html: `
                <h2>Here's your new verification code</h2>
                <p>Your new verification code is: <strong>${verificationCode}</strong></p>
                <p>This code will expire in 30 minutes.</p>
            `
        });

        const tempToken = jwt.sign(
            { userId: user._id, purpose: 'email_verification' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.status(200).json({
            success: true,
            message: 'New verification code sent',
            tempToken,
            userId: user._id
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email })
            .select('+password +loginAttempts +accountLockedUntil +verification.isVerified');

        if (user?.accountLockedUntil && user.accountLockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / (60 * 1000));
            return res.status(403).json({
                success: false,
                message: `Account locked. Try again in ${remainingTime} minutes.`
            });
        }

        if (!user || !(await bcrypt.compare(password, user.password))) {
            if (user) {
                user.loginAttempts += 1;
                
                if (user.loginAttempts >= 5) {
                    user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lock
                    user.loginAttempts = 0;
                    await user.save();
                    
                    return res.status(403).json({
                        success: false,
                        message: 'Too many failed attempts. Account locked for 30 minutes.'
                    });
                }
                
                await user.save();
            }

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.verification.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        user.loginAttempts = 0;
        user.accountLockedUntil = undefined;
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const userData = user.toObject();
        delete userData.password;
        delete userData.loginAttempts;
        delete userData.accountLockedUntil;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, address },
      { new: true }
    );
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

module.exports = {
        signUp,
        verifyEmail,
        resendVerification,
        login
}