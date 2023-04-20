var nodemailer = require('nodemailer');
import { emailService_email, emailService_password } from './emailKeys';
import { v4 as uuid } from 'uuid';
import { IEmailData } from './emailModels';
import { serverLink } from '../serverData';
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
    
    private myHiddenEmail = emailService_email || process.env.emailService_email;
    private myHiddenEmailPassword = emailService_password || process.env.emailService_password;
    private server = serverLink || process.env.serverLink;

    async sendRegistrationEmail(username: String, email: String, hashCode: String){
      let emailData = this.getRegistrationEmail(username, email, hashCode);
      await this.sendEmail(emailData);
    }

    private getRegistrationEmail(username: String, email: String, hashCode: String): IEmailData{
      let link = this.server + emailConfirmationPath + "/" + hashCode;

      let payload: String = `<h2>Dear ${username},</h2>\nThank you for registrating to devControl platform.\nPlease confirm your e-mail address by visiting this link: <h3>${link}</h3>`;
      
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