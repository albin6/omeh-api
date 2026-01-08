import { eventBus } from '../../core/events/event-bus';
import {
  USER_CONNECTED, USER_DISCONNECTED, MATCH_FOUND, STOP_SEARCH,
  VIDEO_USER_CONNECTED, STOP_VIDEO_SEARCH, VIDEO_MATCH_FOUND
} from '../../core/events/events';

interface WaitingUser {
  socket: any; // Using 'any' to avoid direct socket.io dependency
  connectedAt: Date;
}

class MatchmakingService {
  private waitingQueue: WaitingUser[] = [];
  private videoWaitingQueue: WaitingUser[] = [];

  constructor() {
    // Subscribe to events from the event bus
    eventBus.on(USER_CONNECTED, this.handleUserConnected.bind(this));
    eventBus.on(USER_DISCONNECTED, this.handleUserDisconnected.bind(this));
    eventBus.on(STOP_SEARCH, this.handleStopSearch.bind(this));

    // Video chat events
    eventBus.on(VIDEO_USER_CONNECTED, this.handleVideoUserConnected.bind(this));
    eventBus.on(STOP_VIDEO_SEARCH, this.handleStopVideoSearch.bind(this));
  }

  // Text Chat Handlers
  private handleUserConnected(data: { socket: any }): void {
    const { socket } = data;
    socket.emit('waiting', { position: this.waitingQueue.length + 1 });
    this.waitingQueue.push({ socket, connectedAt: new Date() });
    this.attemptMatch(this.waitingQueue, MATCH_FOUND);
  }

  private handleStopSearch(data: { socket: any }): void {
    this.removeUserFromQueue(data.socket.id, this.waitingQueue);
  }

  // Video Chat Handlers
  private handleVideoUserConnected(data: { socket: any }): void {
    const { socket } = data;
    socket.emit('waiting', { position: this.videoWaitingQueue.length + 1 });
    this.videoWaitingQueue.push({ socket, connectedAt: new Date() });
    this.attemptMatch(this.videoWaitingQueue, VIDEO_MATCH_FOUND);
  }

  private handleStopVideoSearch(data: { socket: any }): void {
    this.removeUserFromQueue(data.socket.id, this.videoWaitingQueue);
  }

  // Shared Disconnect Handler
  private handleUserDisconnected(data: { socket: any, reason?: string }): void {
    const { socket } = data;
    this.removeUserFromQueue(socket.id, this.waitingQueue);
    this.removeUserFromQueue(socket.id, this.videoWaitingQueue);
  }

  private removeUserFromQueue(socketId: string, queue: WaitingUser[]): void {
    const index = queue.findIndex(user => user.socket.id === socketId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  private attemptMatch(queue: WaitingUser[], successEvent: string): void {
    // Process matches while we have enough users
    while (queue.length >= 2) {
      // 1. Get the longest waiting user (First In)
      const user1 = queue.shift();

      if (!user1) break;

      // Check if user1 is still connected
      if (!user1.socket.connected) {
        continue;
      }

      // 2. Select a random partner from the remaining queue
      const randomIndex = Math.floor(Math.random() * queue.length);
      const user2 = queue.splice(randomIndex, 1)[0];

      if (user2) {
        // Check if user2 is still connected
        if (!user2.socket.connected) {
          // If user2 is disconnected, we put user1 back at the HEAD of the queue (priority)
          queue.unshift(user1);
          continue;
        }

        // Generate a unique room ID for the match
        const roomId = this.generateRoomId();

        // Emit SUCCESS event (MATCH_FOUND or VIDEO_MATCH_FOUND) with room ID and both sockets
        eventBus.emit(successEvent, {
          roomId,
          user1: user1.socket,
          user2: user2.socket
        });
      } else {
        // Fallback
        queue.unshift(user1);
        break;
      }
    }
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods to get waiting queue sizes
  getWaitingQueueSize(): number {
    return this.waitingQueue.length;
  }

  getVideoWaitingQueueSize(): number {
    return this.videoWaitingQueue.length;
  }
}

export { MatchmakingService };