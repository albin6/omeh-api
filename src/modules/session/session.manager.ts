import { eventBus } from '../../core/events/event-bus';
import { MATCH_FOUND, USER_DISCONNECTED } from '../../core/events/events';

interface Session {
  roomId: string;
  users: Set<string>; // Set of socket IDs
  createdAt: Date;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map(); // roomId -> Session
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomId

  constructor() {
    // Subscribe to events from the event bus
    eventBus.on(MATCH_FOUND, this.handleMatchFound.bind(this));
    eventBus.on(USER_DISCONNECTED, this.handleUserDisconnected.bind(this));
  }

  private handleMatchFound(data: { roomId: string, user1: any, user2: any }): void {
    const { roomId, user1, user2 } = data;
    const user1Id = user1.id;
    const user2Id = user2.id;

    // Create a new session
    const session: Session = {
      roomId,
      users: new Set([user1Id, user2Id]),
      createdAt: new Date()
    };

    this.sessions.set(roomId, session);
    this.socketToRoom.set(user1Id, roomId);
    this.socketToRoom.set(user2Id, roomId);
  }

  private handleUserDisconnected(data: { socket: any, reason?: string }): void {
    const { socket } = data;
    const socketId = socket.id;

    // Check if the socket was part of a session
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) {
      // Socket was not in a session, nothing to clean up
      return;
    }

    // Get the session
    const session = this.sessions.get(roomId);
    if (!session) {
      // Session doesn't exist, nothing to clean up
      return;
    }

    // Remove the socket from the session
    session.users.delete(socketId);
    this.socketToRoom.delete(socketId);

    // If the session is now empty, remove it completely
    if (session.users.size === 0) {
      this.sessions.delete(roomId);
    } else {
      // If there's still one user in the session, keep the session
      // The remaining user will be handled when they disconnect
    }
  }

  // Public method to get session info (for monitoring/debugging)
  getSessionInfo(roomId: string): Session | undefined {
    return this.sessions.get(roomId);
  }

  // Public method to get total number of active sessions
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // Public method to get room ID by socket ID
  getRoomBySocketId(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }
}

export { SessionManager };