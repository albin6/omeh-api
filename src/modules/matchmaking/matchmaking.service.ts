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

    // Emit waiting event to the user with their position in queue (before adding)
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

    // Remove user from waiting queue if they were waiting
    const index = this.waitingQueue.findIndex(user => user.socket.id === socket.id);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }
  }

  private handleStopSearch(data: { socket: any }): void {
    const { socket } = data;

    // Remove user from waiting queue if they were waiting
    const index = this.waitingQueue.findIndex(user => user.socket.id === socket.id);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }
  }

  private attemptMatch(): void {
    // If there are at least 2 users in the queue, create a match
    if (this.waitingQueue.length >= 2) {
      const user1 = this.waitingQueue.shift(); // Get first user
      const user2 = this.waitingQueue.shift(); // Get second user

      if (user1 && user2) {
        // Generate a unique room ID for the match
        const roomId = this.generateRoomId();

        // Emit MATCH_FOUND event with room ID and both sockets
        eventBus.emit(MATCH_FOUND, {
          roomId,
          user1: user1.socket,
          user2: user2.socket
        });
      }
    }
  }

  private generateRoomId(): string {
    // Generate a simple unique room ID
    return `room_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  }

  // Public method to get waiting queue size (for monitoring/debugging)
  getWaitingQueueSize(): number {
    return this.waitingQueue.length;
  }
}

export { MatchmakingService };