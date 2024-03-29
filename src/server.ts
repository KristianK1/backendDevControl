// import * as BodyParser from 'body-parser';
import * as Express from 'express';
import { server as webSocketServer } from 'websocket';
import { MyWebSocketServer } from './WSRouters/WSRouter';
import { wsServerSingletonFactory } from './WSRouters/WSRouterSingletonFactory';
import { emailServiceSingletonFactory } from './emailService/emailService';
import * as path from 'path';
import { firebaseNotificationsSingletonFactory } from "../src/firebaseNotifications/firebaseNotifications_singletonService"

let http = require('http');
let cors = require('cors');

let emailRouter = require('./expressRouters/email/emailRouter.ts');

// let firebaseN = firebaseNotificationsSingletonFactory.getInstance();

export class Server {

    testPath = '/test4';

    port = process.env.PORT || 8000;


    private app: Express.Application;

    private wss: MyWebSocketServer = {} as MyWebSocketServer;
    private wsServer: webSocketServer;
    server: any;

    constructor() {
        // if(!process.env.PORT){
        //     this.port = 3000 + Math.floor(Math.random() * 5000);
        // }
        this.app = Express();
        this.setConfig();
        this.setupRoutes();
        this.setupWSS();
        this.startServer();
        this.startEmailService();
        firebaseNotificationsSingletonFactory.getInstance();
    }

    setConfig() {
        this.server = http.createServer(this.app);
        this.wsServer = new webSocketServer({
            httpServer: this.server,
        });
        var bodyParser = require('body-parser');

        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(cors());
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, '/views'));
    }

    setupRoutes() {
        this.app.get(this.testPath, (req: any, res: any) => {
            console.log(`request:${this.testPath}`);
            res.send(`request:${this.testPath}`);
        });

        this.app.get('/dummy', (req: any, res: any) => {
            console.log('request:/dummy');
            res.send('dummy');
        });

        this.app.get('/not', (req: any, res: any) => {
            // firebaseNotificationsSingletonFactory.getInstance().createAndSendTestNott();
        });

        this.app.use('/email', emailRouter)

        var mainRouter = require('./expressRouters/expressRouter.ts');
        this.app.use('/API', mainRouter);

        this.app.get('/WS_remove', (req: any, res: any) => {
            this.wss.removeAllDeviceClients();
            res.send('ok');
        });

        this.app.get('/WS_stopAccept', (req: any, res: any) => {
            this.wss.stopAccept();
            res.send('stopped accepting');
        });

        this.app.get('/WS_startAccept', (req: any, res: any) => {
            this.wss.startAccept();
            res.send('started accepting');
        });
    }

    startServer() {
        this.server.listen(this.port, () => {
            console.log('listening on port ' + this.port);
        });
    }

    setupWSS() {
        this.wss = wsServerSingletonFactory.getInstance();
        this.wss.setupServer(this.wsServer);
    }

    startEmailService() {
        emailServiceSingletonFactory.getInstance();
    }
}