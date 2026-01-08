import { eventBus } from '../../core/events/event-bus';
import { USER_CONNECTED, USER_DISCONNECTED, MATCH_FOUND, USER_WAITING, STOP_SEARCH } from '../../core/events/events';

interface WaitingUser {
  socket: any; // Using 'any' to avoid direct socket.io dependency
  connectedAt: Date;
}

class MatchmakingService {
  private waitingQueue: WaitingUser[] = [];

  constructor() {
    // Subscribe to events from the event bus
    eventBus.on(USER_CONNECTED, this.handleUserConnected.bind(this));
    eventBus.on(USER_DISCONNECTED, this.handleUserDisconnected.bind(this));
    eventBus.on(STOP_SEARCH, this.handleStopSearch.bind(this));
  }

  private handleUserConnected(data: { socket: any }): void {
    const { socket } = data;

    // Emit waiting event to the user with their position in queue
    socket.emit('waiting', { position: this.waitingQueue.length + 1 });

    // Add user to waiting queue
    this.waitingQueue.push({
      socket,
      connectedAt: new Date()
    });

    // Try to find a match
    this.attemptMatch();
  }

  private handleUserDisconnected(data: { socket: any, reason?: string }): void {
    const { socket } = data;
    this.removeUserFromQueue(socket.id);
  }

  private handleStopSearch(data: { socket: any }): void {
    const { socket } = data;
    this.removeUserFromQueue(socket.id);
  }

  private removeUserFromQueue(socketId: string): void {
    const index = this.waitingQueue.findIndex(user => user.socket.id === socketId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }
  }

  private attemptMatch(): void {
    // Process matches while we have enough users
    while (this.waitingQueue.length >= 2) {
      // 1. Get the longest waiting user (First In)
      const user1 = this.waitingQueue.shift();

      if (!user1) break;

      // Check if user1 is still connected
      if (!user1.socket.connected) {
        continue;
      }

      // 2. Select a random partner from the remaining queue
      // This ensures randomness instead of predictable FIFO pairs matching
      const randomIndex = Math.floor(Math.random() * this.waitingQueue.length);
      const user2 = this.waitingQueue.splice(randomIndex, 1)[0];

      if (user2) {
        // Check if user2 is still connected
        if (!user2.socket.connected) {
          // If user2 is disconnected, we put user1 back at the HEAD of the queue (priority)
          // protecting them from losing their spot
          this.waitingQueue.unshift(user1);
          continue;
        }

        // Generate a unique room ID for the match
        const roomId = this.generateRoomId();

        // Emit MATCH_FOUND event with room ID and both sockets
        eventBus.emit(MATCH_FOUND, {
          roomId,
          user1: user1.socket,
          user2: user2.socket
        });
      } else {
        // Should not happen due to length check, but safe fallback
        this.waitingQueue.unshift(user1);
        break;
      }
    }
  }

  private generateRoomId(): string {
    // Generate a secure unique room ID
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public method to get waiting queue size (for monitoring/debugging)
  getWaitingQueueSize(): number {
    return this.waitingQueue.length;
  }
}

export { MatchmakingService };