var nodemailer = require('nodemailer');
import { emailService_email, emailService_password } from './emailKeys';


var deviceDBObj: EmailService;

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
    
    async sendEmail(reciver: string, reciverCC: string[], reciverBCC: string[], title: string, payload: string){
        console.log(this.myHiddenEmail);
        console.log(this.myHiddenEmailPassword);
        
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            auth: {
              user: this.myHiddenEmail,
              pass: this.myHiddenEmailPassword,
            }
        });

        var mailOptions = {
            from: this.myHiddenEmail,
            to: reciver,
            subject: title,
            text: payload
          };

          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });

    }
}