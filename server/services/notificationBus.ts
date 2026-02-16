type NotificationListener = (notification: Record<string, any>) => void;

class NotificationBus {
  private childListeners = new Map<string, Set<NotificationListener>>();

  subscribeChild(childId: string, listener: NotificationListener): () => void {
    const listeners = this.childListeners.get(childId) || new Set<NotificationListener>();
    listeners.add(listener);
    this.childListeners.set(childId, listeners);

    return () => {
      const current = this.childListeners.get(childId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) {
        this.childListeners.delete(childId);
      }
    };
  }

  publishToChild(childId: string, notification: Record<string, any>) {
    const listeners = this.childListeners.get(childId);
    if (!listeners || listeners.size === 0) return;

    for (const listener of listeners) {
      try {
        listener(notification);
      } catch {
        // ignore listener errors
      }
    }
  }
}

export const notificationBus = new NotificationBus();
