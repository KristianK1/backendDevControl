var nodemailer = require('nodemailer');
import { ITrigger, ITrigRespEmail } from 'models/triggerModels';
import { IEmailData } from './emailModels';
import { emailConfirmationAddEmailPath, emailConfirmationRegisterPath, setupNewPasswordPath } from './emailPaths';
import { bridge_getUserbyId } from '../services/serviceBridge';

export const emailServiceSingletonFactory = (function () {
  var emailServiceInstance: EmailService;

  function createInstance(): EmailService {
    var object = new EmailService();
    return object;
  }

  return {
    getInstance: function () {
      if (!emailServiceInstance) {
        emailServiceInstance = createInstance();
      }
      return emailServiceInstance;
    }
  };
})();


export class EmailService {
  private myHiddenEmail: string;
  private myHiddenEmailPassword: string;
  private server: string; //= serverLink || process.env.serverLink;

  constructor() {

    var secretEmail: string = "";
    var secretPassword: string = "";
    var serverLink: string = "";

    try {
      secretEmail = require('./emailKey_email.json').secretEmail;
      secretPassword = require('./emailKey_password.json').secretPassword;
      serverLink = require('../serverData.json').serverLink;
    } catch (e) {

    }
    this.myHiddenEmail = process.env.emailService_email || secretEmail;
    this.myHiddenEmailPassword = process.env.emailService_password || secretPassword;
    this.server = process.env.serverLink || serverLink;
  }


  async sendRegistrationEmail(username: String, email: String, hashCode: String) {
    let emailData = this.getRegistrationEmail(username, email, hashCode);
    await this.sendEmail(emailData);
  }

  async sendAddEmailEmail(username: String, email: String, hashCode: String) {
    let emailData = this.getAddEmailEmail(username, email, hashCode);
    await this.sendEmail(emailData);
  }

  async sendForgotPasswordEmail(username: string, email: string, hashCode: string) {
    let emailData = this.getForgotPasswordEmail(username, email, hashCode);
    await this.sendEmail(emailData);
  }

  private getRegistrationEmail(username: String, email: String, hashCode: String): IEmailData {
    let link = this.server + "/email" + emailConfirmationRegisterPath + "/" + hashCode;

    let payload: String = `Dear ${username},\nThank you for registrating to devControl platform.\nPlease confirm your e-mail address by visiting this link: ${link}`;

    let data: IEmailData = {
      reciver: email,
      title: 'Please confirm your e-mail address',
      payload: payload,
    }
    return data;
  }

  private getAddEmailEmail(username: String, email: String, hashCode: String): IEmailData {
    let link = this.server + "/email" + emailConfirmationAddEmailPath + "/" + hashCode;

    let payload: String = `Hello,\nYour email address has been entered to the devControl platform under the username \'${username}\'.\nPlease confirm your e-mail address by visiting this link: ${link}`;

    let data: IEmailData = {
      reciver: email,
      title: 'Please confirm your e-mail address',
      payload: payload,
    }
    return data;
  }

  private getForgotPasswordEmail(username: String, email: String, hashCode: String) {
    let link = this.server + "/email" + setupNewPasswordPath + "/" + hashCode;

    let payload: String = `Hello, ${username}\nYou have requested to change the password for the devControl platform.\nBy clicking the link below you will be asked to enter the new password.\nIf you haven't requested to reset the password ignore the link below and contact the system administrator at kristiankliskovic@gmail.com\n\n${link}`;

    let data: IEmailData = {
      reciver: email,
      title: 'Password reset',
      payload: payload,
    }
    return data;
  }

  async sendTriggerResponseEmail(triggerData: ITrigger) {
    let user = await bridge_getUserbyId(triggerData.userId);
    let responseSettings = triggerData.responseSettings as ITrigRespEmail;
    let emailSubject = responseSettings.emailSubject;
    let emailText = responseSettings.emailText;

    let emailSignature = `
    

    This email was automaticly sent from the devControl system as a response to the trigger #${triggerData.id}.

    If you would like to not recive emails like this contact the system administrator at kristiankliskovic@gmail.com .
    `;

    emailText = emailText + emailSignature;
    let data: IEmailData = {
      reciver: user.email,
      title: emailSubject,
      payload: emailText,
    }
    await this.sendEmail(data);
  }

  private async sendEmail(data: IEmailData) {
    console.log("dataaa");

    console.log(this.myHiddenEmail);
    console.log(this.myHiddenEmailPassword);

    let transporter = nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: this.myHiddenEmail,
        pass: this.myHiddenEmailPassword,
      },
      tls: {
        ciphers: 'SSLv3'
      },
      port: 587,
      host: 'smtp.office365.com',
      secureConnection: true,
    });

    var mailOptions = {
      from: this.myHiddenEmail,
      to: data.reciver,
      subject: data.title,
      text: data.payload
    };

    await transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('failed to send email');
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }
}