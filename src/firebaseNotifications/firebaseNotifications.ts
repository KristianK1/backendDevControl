var admin = require('firebase-admin')

export interface FCMCustomData {
    title: string,
    body: string
}
export class FirebaseNotifications {

    async sendNotifications(
        firebaseTokens: string[],
        title: string,
        content: string,
    ) {
        for (let token of firebaseTokens) {
            let data = this.createNotification(token, title, content)
            await this.sendPushNotification(data);
        }
    }

    createNotification(token: string, title: string, content: string) {
        let body = {
            title: title,
            body: content,
        }
        let notificationData = {
            data: { data: JSON.stringify(body) },
            notification: {
                title: title,
                body: content,
            },
            token: token
        }
        return notificationData;
    }

    async sendPushNotification(dddd) {
        try {
            console.log(dddd);

            let x = await admin.messaging().send(dddd).then((response) => {
                console.log("RRR " + response)
            })
            console.log('RRR2 ' + x)
        } catch (e) {
            console.log(e.message);
        }
    }
}