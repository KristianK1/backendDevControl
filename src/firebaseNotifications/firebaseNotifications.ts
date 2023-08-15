import { response } from "express";

var admin = require('firebase-admin')

export class FirebaseNotifications {

    constructor() {
        console.log('saaaaaaaaaaaaaaaaFIREABSE')
        this.test()
    }
    async createAndSendNotification(
        firebaseTokens: string[],
        title: string,
        content: string,
    ) {
        for (let token of firebaseTokens) {
            let body = {
                title: title,
                body: content,
            }
            let dddd = {
                data: { data: JSON.stringify(body) },
                notification: {
                    title: title
                },
                token: token
            }
            await this.sendPushNotification(dddd);
        }
    }

    async test() {
        let token = "eO-XDyqxQ9GxZHhy_GtEgq:APA91bEC7AK1HFErtOEgHvbkYJmmlEl_M9k256iBMqQSwoGHI-o9-Pay7iN2cvuDF_Ia3t9Q0-LejzaEbykIm9a5L2YQh82srCiNb6TvoVl3RC9UsCXycyNUBkXE0ReQlPokJDOgasDv";

        let body = {
            title: "test1",
            body: "content1",
        }
        let dddd = {
            data: { data: JSON.stringify(body) },
            notification: {
                title: "test11111"
            },
            token: token
        }
        // const options = {
        //     priority: 'high',
        //     timeToLive: 60 * 60 * 24
        // };
        await this.sendPushNotification(dddd)
    }

    async sendPushNotification(dddd) {
        try {
            console.log(dddd);

            let x = await admin.messaging().send(dddd).then((response) => {
                console.log("RRR " + response)
            })
        } catch (e) {
            console.log(e.message);
        }
    }
}