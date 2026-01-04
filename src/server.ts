import { App } from './app';
import { MatchmakingService } from './modules/matchmaking/matchmaking.service';
import { ChatService } from './modules/chat/chat.service';
import { SessionManager } from './modules/session/session.manager';
import { logger } from './shared/logger';
import { env } from './config/env';

class Server {
  private app: App;
  private matchmakingService: MatchmakingService;
  private chatService: ChatService;
  private sessionManager: SessionManager;

  constructor() {
    this.app = new App();

    // Initialize services in the correct order
    this.sessionManager = new SessionManager();
    this.matchmakingService = new MatchmakingService();
    this.chatService = new ChatService();

    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown();
    });
  }

  private shutdown(): void {
    logger.info('Shutting down server...');
    process.exit(0);
  }

  public start(): void {
    const port = env.PORT || 3000;

    this.app.getServer().listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Frontend URL configured for: ${env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info('WebSocket Gateway initialized');
      logger.info('Matchmaking Service initialized');
      logger.info('Chat Service initialized');
      logger.info('Session Manager initialized');
    });
  }
}

// Initialize and start the server
const server = new Server();
server.start();

export { Server };