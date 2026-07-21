export class DraftDeleteExecutionLock {
  private running = false;

  isRunning() {
    return this.running;
  }

  async run(onDelete: () => Promise<unknown>, onDeleted?: () => void | Promise<void>) {
    if (this.running) return false;
    this.running = true;
    try {
      await onDelete();
      await onDeleted?.();
      return true;
    } finally {
      this.running = false;
    }
  }
}
