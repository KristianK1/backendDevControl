var express = require('express');
var router = express.Router();

var addDeviceRightsRouter = require('./subrouter/addDeviceRightsRouter');
router.use('/addDeviceRight', addDeviceRightsRouter);

var deleteDeviceRightsRouter = require('./subrouter/deleteDeviceRightsRouter');
router.use('/deleteDeviceRight', deleteDeviceRightsRouter);


var addGroupRightsRouter = require('./subrouter/addGroupRightsRouter');
router.use('/addGroupRight', addGroupRightsRouter);

var deleteGroupRightsRouter = require('./subrouter/deleteGroupRightsRouter');
router.use('/deleteGroupRight', deleteGroupRightsRouter);


var addFieldRightsRouter = require('./subrouter/addFieldRightsRouter');
router.use('/addFieldRight', addFieldRightsRouter);

var deleteFieldRightsRouter = require('./subrouter/deleteFieldRightsRouter');
router.use('/deleteFieldRight', deleteFieldRightsRouter);


var addComplexGroupRightsRouter = require('./subrouter/addComplexGroupRightsRouter');
router.use('/addComplexGroupRight', addComplexGroupRightsRouter);

var deleteComplexGroupRightsRouter = require('./subrouter/deleteComplexGroupRightsRouter');
router.use('/deleteComplexGroupRight', deleteComplexGroupRightsRouter);

var getUserRights = require('./subrouter/getDeviceRights.ts');
router.use('/getUserPermissions', getUserRights);


module.exports = router;