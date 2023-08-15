var express = require('express');
var router = express.Router();

var loginUserAuthRouter = require('./subrouter/loginRouter.ts');
router.use('/login', loginUserAuthRouter);

var registerUserAuthRouter = require('./subrouter/registerRouter.ts');
router.use('/register', registerUserAuthRouter);

var logoutUserAuthRouter = require('./subrouter/logoutRouter.ts');
router.use('/logout', logoutUserAuthRouter);

var deleteUserAuthRouter = require('./subrouter/deleteUserRouter');
router.use('/delete', deleteUserAuthRouter);

var changePasswordRouter = require('./subrouter/changePasswordRouter.ts');
router.use('/changePassword', changePasswordRouter);

var getUsersRouter = require('./subrouter/getUserListRouter.ts');
router.use('/getUsers', getUsersRouter);

var addEmailRouter = require('./subrouter/addEmailRouter.ts');
router.use('/addEmail', addEmailRouter);

module.exports = router;