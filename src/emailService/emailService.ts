var nodemailer = require('nodemailer');
import { IEmailData } from './emailModels';
import { emailConfirmationPath } from './emailPaths';

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


export class EmailService{
    private myHiddenEmail: string;
    private myHiddenEmailPassword: string;
    private server: string; //= serverLink || process.env.serverLink;

    constructor(){
      this.myHiddenEmail = process.env.emailService_emailemailService_email || require("../emailService/emailKey_email.ts");
      this.myHiddenEmailPassword = process.env.emailService_password || require("../emailService/emailKey_password.ts");
      this.server = process.env.serverLink || require("../serverData.ts");
    }

    async sendRegistrationEmail(username: String, email: String, hashCode: String){
      let emailData = this.getRegistrationEmail(username, email, hashCode);
      await this.sendEmail(emailData);
    }

    async sendAddEmailEmail(username: String, email: String, hashCode: String){
      let emailData = this.getAddEmailEmail(username, email, hashCode);
      await this.sendEmail(emailData);
    }

    private getRegistrationEmail(username: String, email: String, hashCode: String): IEmailData{
      let link = this.server + emailConfirmationPath + "/" + hashCode;

      let payload: String = `Dear ${username},\nThank you for registrating to devControl platform.\nPlease confirm your e-mail address by visiting this link: ${link}`;
      
      let data: IEmailData = {
        reciver: email,
        title: 'Please confirm your e-mail address',
        payload: payload,
      }
      return data;
    }

    private getAddEmailEmail(username: String, email: String, hashCode: String): IEmailData{
      let link = this.server + emailConfirmationPath + "/" + hashCode;

      let payload: String = `Hello,\nYour email address has been entered to the devControl platform under the username \'${username}\'.\nPlease confirm your e-mail address by visiting this link: ${link}`;
      
      let data: IEmailData = {
        reciver: email,
        title: 'Please confirm your e-mail address',
        payload: payload,
      }
      return data;
    }

    private async sendEmail(data: IEmailData){
      console.log(this.myHiddenEmail);
      console.log(this.myHiddenEmailPassword);
      
      let transporter = nodemailer.createTransport({
          service: 'hotmail',
          auth: {
            user: this.myHiddenEmail,
            pass: this.myHiddenEmailPassword,
          },
          tls: {
            ciphers:'SSLv3'
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

      await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
  }
}