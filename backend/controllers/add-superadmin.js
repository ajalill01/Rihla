const Admin = require('../models/Admin')
const bcrypt = require('bcrypt')


const createSuperAdmin = async()=>{
    try{
    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists!');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(process.env.ADMIN_PASS, salt);

    const newSuperAdmin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: hashedPass,
      role: 'superadmin',
      permissions: {
        canManageTrips: true,
        canManageUsers: true,
        canManageBookings: true,
        canManageContent: true,
        canManageAdmins: true        
      }
    });

    await newSuperAdmin.save();
    console.log(`Super admin ${newSuperAdmin.email} has been created successfully`);

    }
    catch(e){
        console.log('Error from creating super admin');
    }
}

// createSuperAdmin()

module.exports = createSuperAdmin