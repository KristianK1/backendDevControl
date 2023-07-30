import { forgotPassword_formHandlerPath } from "../../../emailService/emailPaths";

var express = require('express');
var router = express.Router();

router.get('/', (req: any, res: any) => {
    res.render("forgotPassword", {
        formHandlerPath: "/email" + forgotPassword_formHandlerPath,
    });
});

module.exports = router;