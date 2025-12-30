import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    // Increase limit if necessary
    this.setMaxListeners(20);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Typed publish/subscribe helpers could be added here
  // or just use standard emit/on
}

export const eventBus = EventBus.getInstance();
