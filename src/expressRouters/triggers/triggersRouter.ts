var express = require('express');
var router = express.Router();

var addTriggerRouter = require('./triggers_subrouter/addTriggerRouter');
router.use('/addTrigger', addTriggerRouter);

var deleteTriggerRouter = require('./triggers_subrouter/deleteTriggerRouter.ts');
router.use('/deleteTrigger', deleteTriggerRouter);

var seeAllTriggersRouter = require('./triggers_subrouter/seeAllTriggersRouter.ts');
router.use('/getAllTriggers', seeAllTriggersRouter);

module.exports = router;