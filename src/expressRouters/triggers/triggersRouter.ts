var express = require('express');
var router = express.Router();

var addTriggerRouter = require('./triggers_subrouter/addTriggerRouter.ts');
router.use('/addTrigger', addTriggerRouter);


module.exports = router;