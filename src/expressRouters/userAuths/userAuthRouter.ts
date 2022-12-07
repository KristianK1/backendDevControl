import { usersDBSingletonFactory } from "../../firestoreDB/singletonService";

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


var usersDB = usersDBSingletonFactory.getInstance();
router.get('/:id', async (req: any, res: any) => {
    let id = req.params.id;
    let user;
    try {
        user = await usersDB.getUserbyId(id);
    } catch (e) {
        res.status(400);
        res.send(e.message);
    }
    res.json(user);
})

module.exports = router;