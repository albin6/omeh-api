import { eventBus } from '../../core/events/event-bus';
import { MATCH_FOUND } from '../../core/events/events';

interface ChatSession {
  user1: any;
  user2: any;
  roomId: string;
  messageHandler1: (messageData: any) => void;
  messageHandler2: (messageData: any) => void;
  typingStartHandler1: (typingData: any) => void;
  typingStopHandler1: (typingData: any) => void;
  typingStartHandler2: (typingData: any) => void;
  typingStopHandler2: (typingData: any) => void;
  skipChatHandler1: () => void;
  skipChatHandler2: () => void;
  disconnectHandler1: () => void;
  disconnectHandler2: () => void;
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();

  constructor() {
    // Subscribe to MATCH_FOUND event from the event bus
    eventBus.on(MATCH_FOUND, this.handleMatchFound.bind(this));
  }

  private handleMatchFound(data: { roomId: string, user1: any, user2: any }): void {
    const { roomId, user1, user2 } = data;

    // Clean up any existing session for these users to prevent duplicate listeners
    this.cleanupUserSession(user1);
    this.cleanupUserSession(user2);

    // Join both users to the same room
    user1.join(roomId);
    user2.join(roomId);

    // Create handler functions that can be referenced for cleanup
    const messageHandler1 = (messageData: any) => {
      // Broadcast the message to the other user in the room (excluding sender)
      user1.to(roomId).emit('message', {
        from: 'user1',
        content: messageData.content,
        timestamp: new Date()
      });
    };

    const messageHandler2 = (messageData: any) => {
      // Broadcast the message to the other user in the room (excluding sender)
      user2.to(roomId).emit('message', {
        from: 'user2',
        content: messageData.content,
        timestamp: new Date()
      });
    };

    const typingStartHandler1 = (typingData: any) => {
      // Notify the other user that this user is typing
      user1.to(roomId).emit('typing_start', typingData);
    };

    const typingStopHandler1 = (typingData: any) => {
      // Notify the other user that this user stopped typing
      user1.to(roomId).emit('typing_stop', typingData);
    };

    const typingStartHandler2 = (typingData: any) => {
      // Notify the other user that this user is typing
      user2.to(roomId).emit('typing_start', typingData);
    };

    const typingStopHandler2 = (typingData: any) => {
      // Notify the other user that this user stopped typing
      user2.to(roomId).emit('typing_stop', typingData);
    };

    const skipChatHandler1 = () => {
      // Notify the other user that this user skipped the chat
      user1.to(roomId).emit('user_disconnected');
      // Tell the skipping user to go back to searching
      user1.emit('user_disconnected');
    };

    const skipChatHandler2 = () => {
      // Notify the other user that this user skipped the chat
      user2.to(roomId).emit('user_disconnected');
      // Tell the skipping user to go back to searching
      user2.emit('user_disconnected');
    };

    const disconnectHandler1 = () => {
      // Notify the other user that their chat partner disconnected
      user1.to(roomId).emit('user_disconnected', { roomId });
      // Clean up the session
      this.cleanupSession(roomId);
    };

    const disconnectHandler2 = () => {
      // Notify the other user that their chat partner disconnected
      user2.to(roomId).emit('user_disconnected', { roomId });
      // Clean up the session
      this.cleanupSession(roomId);
    };

    // Register message listeners
    user1.on('message', messageHandler1);
    user2.on('message', messageHandler2);

    // Register typing listeners
    user1.on('typing_start', typingStartHandler1);
    user1.on('typing_stop', typingStopHandler1);
    user2.on('typing_start', typingStartHandler2);
    user2.on('typing_stop', typingStopHandler2);

    // Register skip listeners
    user1.on('skip_chat', skipChatHandler1);
    user2.on('skip_chat', skipChatHandler2);

    // Register disconnect listeners
    user1.on('disconnect', disconnectHandler1);
    user2.on('disconnect', disconnectHandler2);

    // Store the session with all handlers for cleanup
    const session: ChatSession = {
      user1,
      user2,
      roomId,
      messageHandler1,
      messageHandler2,
      typingStartHandler1,
      typingStopHandler1,
      typingStartHandler2,
      typingStopHandler2,
      skipChatHandler1,
      skipChatHandler2,
      disconnectHandler1,
      disconnectHandler2
    };

    this.sessions.set(roomId, session);

    // Emit match_found event to both users
    user1.emit('match_found', { roomId });
    user2.emit('match_found', { roomId });
  }

  private cleanupUserSession(user: any): void {
    // Find and clean up any existing session for this user
    for (const [roomId, session] of this.sessions.entries()) {
      if (session.user1.id === user.id || session.user2.id === user.id) {
        this.cleanupSession(roomId);
        break;
      }
    }
  }

  private cleanupSession(roomId: string): void {
    const session = this.sessions.get(roomId);
    if (!session) return;

    const { user1, user2,
      messageHandler1, messageHandler2,
      typingStartHandler1, typingStopHandler1,
      typingStartHandler2, typingStopHandler2,
      skipChatHandler1, skipChatHandler2,
      disconnectHandler1, disconnectHandler2 } = session;

    // Remove all event listeners to prevent memory leaks and duplicate handlers
    user1.off('message', messageHandler1);
    user2.off('message', messageHandler2);

    user1.off('typing_start', typingStartHandler1);
    user1.off('typing_stop', typingStopHandler1);
    user2.off('typing_start', typingStartHandler2);
    user2.off('typing_stop', typingStopHandler2);

    user1.off('skip_chat', skipChatHandler1);
    user2.off('skip_chat', skipChatHandler2);

    user1.off('disconnect', disconnectHandler1);
    user2.off('disconnect', disconnectHandler2);

    // Remove the session from our map
    this.sessions.delete(roomId);
  }
}

export { ChatService };