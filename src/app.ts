import express from 'express';
import { createServer } from 'http';
import { SocketGateway } from './modules/gateway/socket.gateway';

class App {
  public app: express.Application;
  private server: any;
  private socketGateway: SocketGateway;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    // Initialize WebSocket Gateway
    this.socketGateway = new SocketGateway(this.server);
    
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json());
    
    // CORS middleware (configured in socket gateway)
    // Additional middleware can be added here if needed
  }

  getServer() {
    return this.server;
  }

  getSocketGateway() {
    return this.socketGateway;
  }
}

export { App };