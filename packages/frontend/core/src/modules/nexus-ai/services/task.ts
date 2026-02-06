import { LiveData, Service } from '@toeverything/infra';

import type { Commitment } from './trigger';

export interface NexusTask extends Commitment {
  id: string;
  docId: string;
  timestamp: number;
}

export class NexusTaskService extends Service {
  private readonly tasks$ = new LiveData<NexusTask[]>([]);

  addTask(docId: string, commitment: Commitment) {
    const newTask: NexusTask = {
      ...commitment,
      id: Math.random().toString(36).substring(7),
      docId,
      timestamp: Date.now(),
    };

    const current = this.tasks$.value;
    // Simple deduplication based on task name and docId within a short timeframe
    const isDuplicate = current.some(
      t =>
        t.task === newTask.task &&
        t.docId === docId &&
        newTask.timestamp - t.timestamp < 60000
    );

    if (!isDuplicate) {
      this.tasks$.next([newTask, ...current].slice(0, 50)); // Keep last 50
    }
  }

  get allTasks$() {
    return this.tasks$;
  }

  clearTasks() {
    this.tasks$.next([]);
  }

  removeTask(id: string) {
    this.tasks$.next(this.tasks$.value.filter(t => t.id !== id));
  }
}
