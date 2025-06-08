const Admin = require('../models/Admin')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const createAdmin = async (req, res) => {
  try {

    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only superadmins can create admins' 
      });
    }

    const { email, password, permissions } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const newAdmin = new Admin({
      email,
      password: await bcrypt.hash(password, 10),
      permissions: {
        canManageTrips: permissions?.canManageTrips || false,
        canManageUsers: permissions?.canManageUsers || false,
        canManageBookings: permissions?.canManageBookings || false,
        canManageContent: permissions?.canManageContent || false,
        canManageAdmins: false
      }
    });

    await newAdmin.save();
    
    res.status(201).json({ 
      success: true, 
      admin: newAdmin 
    });

  } catch (e) {
    console.log('Error from createAdmin',e)

    if (e.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Admin creation failed',
    });
  }
};


const getAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {
      role: 'admin'
    };
    
    if (req.query.email) {
      filters.email = { $regex: req.query.email, $options: 'i' };
    }

    const sortOptions = {};
    if (req.query.sort) {
      const [field, order] = req.query.sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const [admins, total] = await Promise.all([
      Admin.find(filters)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
        
      Admin.countDocuments(filters)
    ]);

    res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });

  } catch (e) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
};

const updateAdminPermissions = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can modify permissions'
      });
    }

    const { adminId } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid permissions object required'
      });
    }

    const adminToUpdate = await Admin.findById(adminId);
    if (!adminToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (adminToUpdate._id.toString() === req.admin.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify your own permissions'
      });
    }


    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      {
        $set: {
          'permissions.canManageTrips': permissions.canManageTrips ?? adminToUpdate.permissions.canManageTrips,
          'permissions.canManageUsers': permissions.canManageUsers ?? adminToUpdate.permissions.canManageUsers,
          'permissions.canManageBookings': permissions.canManageBookings ?? adminToUpdate.permissions.canManageBookings,
          'permissions.canManageContent': permissions.canManageContent ?? adminToUpdate.permissions.canManageContent,
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      admin: updatedAdmin
    });

  } catch (e) {
    console.error('Permission update error:', e);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can delete admins'
      });
    }

    const { adminId } = req.params;

    const adminToDelete = await Admin.findById(adminId);
    if (!adminToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (adminToDelete._id.toString() === req.admin.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await Admin.findByIdAndDelete(adminId);

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (e) {
    console.error('Delete admin error:', e);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
};
module.exports = {createAdmin,getAdmins,updateAdminPermissions,deleteAdmin}