const express = require('express')
const router = express.Router()

const authAdmin = require('../middleware/admin-auth')
const {createAdmin,getAdmins,updateAdminPermissions,deleteAdmin}=require('../controllers/superadmin-controllers')


router.post('/add-admin',authAdmin,createAdmin)
router.get('/get',authAdmin,getAdmins)
router.patch('/update/:adminId/permissions',authAdmin,updateAdminPermissions)
router.delete('/delete/:adminId', authAdmin, deleteAdmin);

module.exports = router