import { Hash } from "crypto";
import { IEmailConfirmationData } from "../../emailService/emailModels";
import { emailConfirmationAddEmailPath, emailConfirmationRegisterPath, emailConfirmation_formHandlerPath } from "../../emailService/emailPaths";
import { usersDBSingletonFactory } from "../../firestoreDB/singletonService";
import { IUser } from "models/basicModels";
import { validate } from "uuid";

var validator = require("email-validator");

var express = require('express');
var router = express.Router();

router.get('/emailTest', (req: any, res: any) => {
    console.log("emailSendTest");
    // emailServiceSingletonFactory.getInstance().sendEmail("devControlService@gmail.com", [], [], "Thank you for mentioning us", "We hope you are doing great.");
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
    res.render("forgotPassword");
});

router.post("/forgotPasswordForm", async (req: any, res: any) => {
    let emailORpassword = req.body.emailORpassword;
    console.log(emailORpassword);

    let user: IUser;
    let emailTyped = validator.validate(emailORpassword) 
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
        } catch (e) {
            console.log(e.message);
            res.render('fp_wrongUsername');
            return;
        }
    }

    
});

module.exports = router;