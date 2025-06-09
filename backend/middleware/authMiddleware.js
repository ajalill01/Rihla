// const jwt = require('jsonwebtoken');
// const Admin = require('../models/Admin');

// const authenticateAdmin = async (req, res, next) => {
//     try {
//         const token = req.header('Authorization')?.replace('Bearer ', '');
        
//         if (!token) {
//             return res.status(401).json({ 
//                 success: false, 
//                 message: 'Authentication required' 
//             });
//         }

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const admin = await Admin.findById(decoded.id).select('+permissions');
        
//         if (!admin) {
//             return res.status(401).json({ 
//                 success: false, 
//                 message: 'Admin not found' 
//             });
//         }

//         // Attach admin info and permissions to request
//         req.adminInfo = {
//             id: admin._id,
//             email: admin.email,
//             role: admin.role,
//             permissions: admin.permissions
//         };

//         next();
//     } catch (e) {
//         console.error('Authentication error:', e);
//         return res.status(401).json({ 
//             success: false, 
//             message: 'Please authenticate' 
//         });
//     }
// };

// // Optional: Permission checker middleware
// const checkPermission = (permission) => {
//     return (req, res, next) => {
//         if (!req.adminInfo.permissions[permission]) {
//             return res.status(403).json({
//                 success: false,
//                 message: `Unauthorized: You need ${permission} permission`
//             });
//         }
//         next();
//     };
// };

// module.exports = {
//     authenticateAdmin,
//     checkPermission
// };