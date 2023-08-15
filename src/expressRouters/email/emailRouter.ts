import { emailConfirmationAddEmailPath, emailConfirmationRegisterPath, emailConfirmation_formHandlerPath, forgotPasswordPath, forgotPassword_formHandlerPath, setupNewPasswordPath, setupNewPassword_formHandlerPath } from "../../emailService/emailPaths";

var express = require('express');
var router = express.Router();

let emailConfirmationRegisterRouter = require('./email_subrouter/emailConfirmationRegisterRouter');
router.use(emailConfirmationRegisterPath, emailConfirmationRegisterRouter);

let emailConfirmationAddEmailRouter = require('./email_subrouter/emailConfirmationAddEmailRouter');
router.use(emailConfirmationAddEmailPath, emailConfirmationAddEmailRouter);

let emailConfirmationformHandlerRouter = require('./email_subrouter/emailConfirmationFormHandlerRouter');
router.use(emailConfirmation_formHandlerPath, emailConfirmationformHandlerRouter);

let forgotPasswordRouter = require('./email_subrouter/forgotPasswordRouter');
router.use(forgotPasswordPath, forgotPasswordRouter);

let forgotPasswordFormHandlerRouter = require('./email_subrouter/forgotPasswordFormHandlerRouter');
router.use(forgotPassword_formHandlerPath, forgotPasswordFormHandlerRouter);

let setupNewPasswordRouter = require('./email_subrouter/setupNewPasswordRouter');
router.use(setupNewPasswordPath, setupNewPasswordRouter);

let setupNewPasswordFormHandlerRouter = require('./email_subrouter/setupNewPasswordFormHandlerRouter');
router.use(setupNewPassword_formHandlerPath, setupNewPasswordFormHandlerRouter);

module.exports = router;
