// import * as BodyParser from 'body-parser';
import * as Express from 'express';
import { firestoreSingletonFactory } from './firestoreDB/singletonService';
import { server as webSocketServer } from 'websocket';
import { MyWebSocketServer } from './WSRouters/WSRouter';
import { wsServerSingletonFactory } from './WSRouters/WSRouterSingletonFactory';
import { emailServiceSingletonFactory } from './emailService/emailService';
let http = require('http');
let cors = require('cors');


export class Server {

    testPath = '/test3';
    port = process.env.PORT || 8000;

    private app: Express.Application;

    private wss: MyWebSocketServer = {} as MyWebSocketServer;
    private wsServer: webSocketServer;
    server: any;

    constructor() {
        this.app = Express();
        this.setConfig();
        this.setupRoutes();
        this.setupWSS();
        this.startServer();
        this.startEmailService();
        // this.startTimeout();
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

        this.app.get('/update', (req: any, res: any) => {
            console.log('request:/update');
            firestoreSingletonFactory.getInstance().updateDocumentValue('proba', 'Kristian', {
                [`deviceFieldComplexGroups.${7}.fieldGroupStates.${4}.hello2`]: "JA SAM3"
            });
            res.send('update');
        });

        this.app.get('/emailTest', (req: any, res: any) => {
            console.log("emailSendTest");
            emailServiceSingletonFactory.getInstance().sendEmail("devControlService@gmail.com", [], [], "Thank you for mentioning us", "We hope you are doing great.");
            res.sendStatus(200);
        });

        var mainRouter = require('./expressRouters/expressRouter.ts');
        this.app.use('/API', mainRouter);
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


    startTimeout() {
        const timeout = setInterval(() => {
            let x = 3;
        }, 5 * 1000);
    }

    startEmailService(){
        emailServiceSingletonFactory.getInstance();
    }
}