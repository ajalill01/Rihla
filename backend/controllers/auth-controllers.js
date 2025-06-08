const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // 2. Find admin (with password field included)
        const existingAdmin = await Admin.findOne({ email }).select('+password');
        if (!existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // 3. Compare passwords
        const isPasswordMatch = await bcrypt.compare(password, existingAdmin.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // 4. Create JWT token
        const token = jwt.sign(
            {
                adminId: existingAdmin._id,
                email: existingAdmin.email,
                role: existingAdmin.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // 5. Remove password from response
        const adminData = existingAdmin.toObject();
        delete adminData.password;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            admin: adminData
        });

    } catch (e) {
        console.error('Login error:', e);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
module.exports = { loginAdmin };