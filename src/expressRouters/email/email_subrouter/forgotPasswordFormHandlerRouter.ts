import { UserService } from "../../../services/userService";
import { userServiceSingletonFactory } from "../../../services/serviceSingletonFactory";
import { forgotPassword_formHandlerPath } from "emailService/emailPaths";
import { IUser } from "models/basicModels";

var validator = require("email-validator");

var express = require('express');
var router = express.Router();

var userService: UserService = userServiceSingletonFactory.getInstance();

router.post('/', async (req: any, res: any) => {
    let emailORpassword = req.body.emailORpassword;
    console.log(emailORpassword);

    let user: IUser;
    let emailTyped = validator.validate(emailORpassword);
    if (emailTyped) {
        try {
            console.log("email");
            user = await userService.getUserbyEmail(emailORpassword);
        } catch (e) {
            console.log(e.message);
            res.render('fp_wrongEmail');
            return;
        }
    } else {
        try {
            console.log("not email");
            user = await userService.getUserbyName(emailORpassword);

            if(user.email === ""){
                res.render("fp_userWithoutEmail");
                return;
            }
        } catch (e) {
            console.log(e.message);
            res.render('fp_wrongUsername');
            return;
        }
    }
    try {
        await userService.createForgotPasswordRequest(user.id, user.username, user.email);
        
        let emailShown = user.email;
        if(!emailTyped){
            var i = emailShown.indexOf('@');
            var startIndex = i * .2 | 0;
            var endIndex   = i * .9 | 0;
            emailShown = emailShown.slice(0, startIndex) +
                    emailShown.slice(startIndex, endIndex).replace(/./g, '*') +
                    emailShown.slice(endIndex);
        }

        res.render("fp_emailSent", {
            email: emailShown
        });
    }
    catch (e) {
        console.log(e.message);
        res.render('fp_errorAtSendingEmail');
        return;
    }
});

module.exports = router;
