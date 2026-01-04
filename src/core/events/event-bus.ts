type EventHandler = (payload: any) => void;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      return;
    }

    const handlers = this.handlers.get(event)!;
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event: string, payload?: any): void {
    if (!this.handlers.has(event)) {
      return;
    }

    const handlers = this.handlers.get(event)!;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }
  }
}

export const eventBus = new EventBus();