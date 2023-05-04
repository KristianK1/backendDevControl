import { IEmailConfirmationData } from "../../emailService/emailModels";
import { emailConfirmationPath } from "../../emailService/emailPaths";
import { usersDBSingletonFactory } from "../../firestoreDB/singletonService";
import { IUser } from "models/basicModels";

var express = require('express');
var router = express.Router();

router.get('/emailTest', (req: any, res: any) => {
    console.log("emailSendTest");
    // emailServiceSingletonFactory.getInstance().sendEmail("devControlService@gmail.com", [], [], "Thank you for mentioning us", "We hope you are doing great.");
    res.sendStatus(200);
});


router.get(emailConfirmationPath + "/:hashCode", async (req: any, res: any) => {
    // res.send(req.params.hashCode);

    let data: IEmailConfirmationData;
    let user: IUser;
    try{
        data = await usersDBSingletonFactory.getInstance().getEmailConfirmationData(req.params.hashCode);
        user = await usersDBSingletonFactory.getInstance().getUserbyId(data.userId);
    }
    catch (e) {
        console.log(e.message);
        res.status(200);
        res.send('Error at confirming email. ' + e.message);
        return;
    }

    res.render('confirmEmail', {email: data.email, username: user.username, submitF: function() {
        console.log("onClick worked")
        usersDBSingletonFactory.getInstance().confirmEmail(data.hashCode);
    }});
});

router.get("/forgotPassword", (req: any,res: any) => {
    res.render("forgotPassword");
});

module.exports = router;