import { Service } from '@toeverything/infra';
import { debounceTime, Subject } from 'rxjs';

export class IdleService extends Service {
  private readonly idleSubject$ = new Subject<string>(); // docId

  // 3 seconds threshold as per execution plan
  readonly idle$ = this.idleSubject$.asObservable().pipe(debounceTime(3000));

  constructor() {
    super();
    console.log('[IdleService] initialized');
  }

  notifyChange(docId: string) {
    console.log(`[IdleService] notifyChange called for doc: ${docId}`);
    this.idleSubject$.next(docId);
  }
}
