//--------------------------------------------------------------------------------------
//                            Web Routes (Server-side Rendered)
//--------------------------------------------------------------------------------------

const express = require('express');
const router = express.Router();
const webController = require('../controller/ejsController');
const { verifyTokenWeb, checkPermissionWeb } = require('../middleware/webMiddleware');

//--------------------------------------------------------------------------------------
//                            Public Routes
//--------------------------------------------------------------------------------------


router.get('/', webController.home);


router.get('/login', webController.showLogin);
router.post('/login', webController.handleLogin);

router.get('/register', webController.showRegister);
router.post('/register', webController.handleRegister);

router.post('/logout', webController.handleLogout);

//--------------------------------------------------------------------------------------
//                            Protected Routes
//--------------------------------------------------------------------------------------


router.get('/dashboard', verifyTokenWeb, webController.dashboard);


router.get('/records', verifyTokenWeb, checkPermissionWeb('read_record'), webController.recordsList);
router.get('/records/new', verifyTokenWeb, checkPermissionWeb('create_record'), webController.newRecord);
router.post('/records/new', verifyTokenWeb, checkPermissionWeb('create_record'), webController.createRecord);
router.get('/records/:id', verifyTokenWeb, checkPermissionWeb('read_record'), webController.viewRecord);
router.get('/records/:id/edit', verifyTokenWeb, checkPermissionWeb('update_record'), webController.editRecord);
router.post('/records/:id/edit', verifyTokenWeb, checkPermissionWeb('update_record'), webController.updateRecord);
router.post('/records/:id/delete', verifyTokenWeb, checkPermissionWeb('delete_record'), webController.deleteRecord);


router.get('/users', verifyTokenWeb, checkPermissionWeb('manage_users'), webController.usersList);
router.get('/users/:id', verifyTokenWeb, checkPermissionWeb('manage_users'), webController.viewUser);
router.post('/users/:id/role', verifyTokenWeb, checkPermissionWeb('manage_users'), webController.updateUserRole);
router.post('/users/:id/status', verifyTokenWeb, checkPermissionWeb('manage_users'), webController.toggleUserStatus);


router.get('/profile', verifyTokenWeb, webController.profile);
router.post('/profile/password', verifyTokenWeb, webController.changePassword);

module.exports = router;
