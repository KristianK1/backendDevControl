import { Hash } from "crypto";
import { IEmailConfirmationData } from "../../emailService/emailModels";
import { emailConfirmationAddEmailPath, emailConfirmationRegisterPath, emailConfirmation_formHandlerPath, forgotPassword_formHandlerPath, setupNewPasswordPath, setupNewPassword_formHandlerPath } from "../../emailService/emailPaths";
import { usersDBSingletonFactory } from "../../firestoreDB/singletonService";
import { IUser } from "models/basicModels";
import { validate } from "uuid";

var validator = require("email-validator");

var express = require('express');
var router = express.Router();

router.get('/emailTest', (req: any, res: any) => {
    console.log("emailSendTest");
    // emailServiceSingletonFactory.getInstance().sendEmail("kikihd11@gmail.com", [], [], "Thank you for mentioning us", "We hope you are doing great.");
    res.sendStatus(200);
});


router.post(emailConfirmation_formHandlerPath + "/:hashCode", async (req: any, res: any) => {
    console.log("tu saaaaaaaaaam");
    console.log(req.params.hashCode);
    try {
        await usersDBSingletonFactory.getInstance().confirmEmail(req.params.hashCode);
        res.render("successConfirmingEmail");
    }
    catch (e) {
        console.log(e.message);
        res.render('errorConfirmingEmail');
    }
});


router.get(emailConfirmationRegisterPath + "/:hashCode", async (req: any, res: any) => {
    // res.send(req.params.hashCode);

    let data: IEmailConfirmationData;
    let user: IUser;
    try {
        data = await usersDBSingletonFactory.getInstance().getEmailConfirmationData(req.params.hashCode);
        user = await usersDBSingletonFactory.getInstance().getUserbyId(data.userId);
    }
    catch (e) {
        console.log(e.message);
        res.render('errorConfirmingEmail');
        return;
    }

    res.render('confirmEmail', {
        email: data.email,
        username: user.username,
        formHandlerPath: "../../email" + emailConfirmation_formHandlerPath + "/" + data.hashCode
    });
});

router.get(emailConfirmationAddEmailPath + "/:hashCode", async (req: any, res: any) => {
    // res.send(req.params.hashCode);

    let data: IEmailConfirmationData;
    let user: IUser;
    try {
        data = await usersDBSingletonFactory.getInstance().getEmailConfirmationData(req.params.hashCode);
        user = await usersDBSingletonFactory.getInstance().getUserbyId(data.userId);
    }
    catch (e) {
        console.log(e.message);
        res.render('errorConfirmingEmail');
        return;
    }

    res.render('confirmEmail', {
        email: data.email,
        username: user.username,
        formHandlerPath: "../../email" + emailConfirmation_formHandlerPath + "/" + data.hashCode
    });
});

router.get("/forgotPassword", (req: any, res: any) => {
    res.render("forgotPassword", {
        formHandlerPath: "/email" + forgotPassword_formHandlerPath,
    });
});

router.post(forgotPassword_formHandlerPath, async (req: any, res: any) => {
    let emailORpassword = req.body.emailORpassword;
    console.log(emailORpassword);

    let user: IUser;
    let emailTyped = validator.validate(emailORpassword);
    if (emailTyped) {
        try {
            console.log("email");
            user = await usersDBSingletonFactory.getInstance().getUserbyEmail(emailORpassword);
        } catch (e) {
            console.log(e.message);
            res.render('fp_wrongEmail');
            return;
        }
    } else {
        try {
            console.log("not email");
            user = await usersDBSingletonFactory.getInstance().getUserbyName(emailORpassword);

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
        await usersDBSingletonFactory.getInstance().createForgotPasswordRequest(user.id, user.username, user.email);
        
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

router.get(setupNewPasswordPath + "/:hashCode", async (req: any, res: any) => {
    console.log("tu saaaaaaaaaam");
    console.log(req.params.hashCode);


    try{
        let request = await usersDBSingletonFactory.getInstance().getForgotPasswordRequest(req.params.hashCode);
        res.render('enterNewPassword', {
            formHandlerPath: "../../email" + setupNewPassword_formHandlerPath + "/" + request.hashCode
        });
    }catch(e){
        res.json("Ne radi");
    }
});

router.post(setupNewPassword_formHandlerPath + "/:hashCode", async (req: any, res: any) => {
    let hashCode: string = req.params.hashCode;
    let newPassword: string = req.body.password;
    let newPasswordAgain: string = req.body.confirmPassword;
    if(newPassword !== newPasswordAgain){
        res.render("fp_unequalPasswords");
        return;
    }
    try{
        await usersDBSingletonFactory.getInstance().changePasswordViaForgetPasswordRequest(req.params.hashCode, newPassword);
        res.render('fp_newPasswordSuccess');
    }catch(e){
        res.render("fp_newPasswordError");
    }

});

module.exports = router;