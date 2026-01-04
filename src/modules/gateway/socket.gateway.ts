import { Server, Socket } from 'socket.io';
import { eventBus } from '../../core/events/event-bus';
import { USER_CONNECTED, USER_DISCONNECTED, STOP_SEARCH } from '../../core/events/events';

class SocketGateway {
  private io: Server;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173", // Vite default port
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      // Emit event to the event bus when a user connects
      eventBus.emit(USER_CONNECTED, { socket });

      socket.on('disconnect', (reason) => {
        // Emit event to the event bus when a user disconnects
        eventBus.emit(USER_DISCONNECTED, { socket, reason });
      });

      socket.on('start_search', () => {
        // Emit event to the event bus when a user explicitly starts searching
        eventBus.emit(USER_CONNECTED, { socket });
      });

      socket.on('stop_search', () => {
        // Emit event to the event bus when a user stops searching
        eventBus.emit(STOP_SEARCH, { socket });
      });
    });
  }

  getIO(): Server {
    return this.io;
  }
}

export { SocketGateway };