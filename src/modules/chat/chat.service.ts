import { eventBus } from '../../core/events/event-bus';
import { MATCH_FOUND, VIDEO_MATCH_FOUND } from '../../core/events/events';

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
  // Signal handlers (optional, for video)
  signalOfferHandler1?: (data: any) => void;
  signalAnswerHandler1?: (data: any) => void;
  signalIceCandidateHandler1?: (data: any) => void;
  signalOfferHandler2?: (data: any) => void;
  signalAnswerHandler2?: (data: any) => void;
  signalIceCandidateHandler2?: (data: any) => void;
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();

  constructor() {
    // Subscribe to events
    eventBus.on(MATCH_FOUND, this.handleMatchFound.bind(this));
    eventBus.on(VIDEO_MATCH_FOUND, this.handleVideoMatchFound.bind(this));
  }

  // ... (Existing handleMatchFound, keeping it specifically for Text Chat) ...
  // Actually, for brevity in this replace block, I will strictly ADD the new method and constructor update
  // But wait, replace_file_content replaces a block. I need to be careful.

  // I will just implement a generic setup method or copy-paste. 
  // Given the complexity rating, I'll copy-paste handleMatchFound logic into handleVideoMatchFound 
  // and add the signal handlers.

  private handleMatchFound(data: { roomId: string, user1: any, user2: any }): void {
    this.setupSession(data, false);
  }

  private handleVideoMatchFound(data: { roomId: string, user1: any, user2: any }): void {
    this.setupSession(data, true);
  }

  private setupSession(data: { roomId: string, user1: any, user2: any }, isVideo: boolean): void {
    const { roomId, user1, user2 } = data;

    // Clean up any existing session for these users
    this.cleanupUserSession(user1);
    this.cleanupUserSession(user2);

    // Join both users to the same room
    user1.join(roomId);
    user2.join(roomId);

    // --- Message Handlers ---
    const messageHandler1 = (messageData: any) => {
      user1.to(roomId).emit('message', {
        from: 'user1',
        content: messageData.content,
        timestamp: new Date()
      });
    };

    const messageHandler2 = (messageData: any) => {
      user2.to(roomId).emit('message', {
        from: 'user2',
        content: messageData.content,
        timestamp: new Date()
      });
    };

    // --- Typing Handlers ---
    const typingStartHandler1 = (data: any) => user1.to(roomId).emit('typing_start', data);
    const typingStopHandler1 = (data: any) => user1.to(roomId).emit('typing_stop', data);
    const typingStartHandler2 = (data: any) => user2.to(roomId).emit('typing_start', data);
    const typingStopHandler2 = (data: any) => user2.to(roomId).emit('typing_stop', data);

    // --- Skip Handlers ---
    const skipChatHandler1 = () => {
      user1.to(roomId).emit('user_disconnected');
      user1.emit('user_disconnected');
    };

    const skipChatHandler2 = () => {
      user2.to(roomId).emit('user_disconnected');
      user2.emit('user_disconnected');
    };

    // --- Disconnect Handlers ---
    const disconnectHandler1 = () => {
      user1.to(roomId).emit('user_disconnected', { roomId });
      this.cleanupSession(roomId);
    };

    const disconnectHandler2 = () => {
      user2.to(roomId).emit('user_disconnected', { roomId });
      this.cleanupSession(roomId);
    };

    // --- Signal Handlers (Video Only) ---
    let signalHandlers = {};
    if (isVideo) {
      const createSignalHandler = (sender: any, event: string) => (data: any) => {
        sender.to(roomId).emit(event, data);
      };

      signalHandlers = {
        signalOfferHandler1: createSignalHandler(user1, 'signal_offer'),
        signalAnswerHandler1: createSignalHandler(user1, 'signal_answer'),
        signalIceCandidateHandler1: createSignalHandler(user1, 'signal_ice_candidate'),
        signalOfferHandler2: createSignalHandler(user2, 'signal_offer'),
        signalAnswerHandler2: createSignalHandler(user2, 'signal_answer'),
        signalIceCandidateHandler2: createSignalHandler(user2, 'signal_ice_candidate'),
      };

      // Register Signal Listeners
      user1.on('signal_offer', (signalHandlers as any).signalOfferHandler1);
      user1.on('signal_answer', (signalHandlers as any).signalAnswerHandler1);
      user1.on('signal_ice_candidate', (signalHandlers as any).signalIceCandidateHandler1);

      user2.on('signal_offer', (signalHandlers as any).signalOfferHandler2);
      user2.on('signal_answer', (signalHandlers as any).signalAnswerHandler2);
      user2.on('signal_ice_candidate', (signalHandlers as any).signalIceCandidateHandler2);
    }

    // Register Common Listeners
    user1.on('message', messageHandler1);
    user2.on('message', messageHandler2);
    user1.on('typing_start', typingStartHandler1);
    user1.on('typing_stop', typingStopHandler1);
    user2.on('typing_start', typingStartHandler2);
    user2.on('typing_stop', typingStopHandler2);
    user1.on('skip_chat', skipChatHandler1);
    user2.on('skip_chat', skipChatHandler2);
    user1.on('disconnect', disconnectHandler1);
    user2.on('disconnect', disconnectHandler2);

    // Store the session
    const session: ChatSession = {
      user1, user2, roomId,
      messageHandler1, messageHandler2,
      typingStartHandler1, typingStopHandler1,
      typingStartHandler2, typingStopHandler2,
      skipChatHandler1, skipChatHandler2,
      disconnectHandler1, disconnectHandler2,
      ...signalHandlers
    };

    this.sessions.set(roomId, session);

    // Emit match_found event
    // For video, we might want to emit 'video_match_found' or just 'match_found' with metadata
    // Frontend `useChatSocket` listens to `match_found`. `useVideoChat` will too.
    const eventName = isVideo ? 'video_match_found' : 'match_found';
    user1.emit(eventName, { roomId, initiator: true });
    user2.emit(eventName, { roomId, initiator: false });
  }

  private cleanupUserSession(user: any): void {
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
      typingStartHandler1, typingStopHandler1, typingStartHandler2, typingStopHandler2,
      skipChatHandler1, skipChatHandler2, disconnectHandler1, disconnectHandler2,
      signalOfferHandler1, signalAnswerHandler1, signalIceCandidateHandler1,
      signalOfferHandler2, signalAnswerHandler2, signalIceCandidateHandler2
    } = session;

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

    // Clean signal handlers
    if (signalOfferHandler1) user1.off('signal_offer', signalOfferHandler1);
    if (signalAnswerHandler1) user1.off('signal_answer', signalAnswerHandler1);
    if (signalIceCandidateHandler1) user1.off('signal_ice_candidate', signalIceCandidateHandler1);
    if (signalOfferHandler2) user2.off('signal_offer', signalOfferHandler2);
    if (signalAnswerHandler2) user2.off('signal_answer', signalAnswerHandler2);
    if (signalIceCandidateHandler2) user2.off('signal_ice_candidate', signalIceCandidateHandler2);

    this.sessions.delete(roomId);
  }
}

export { ChatService };