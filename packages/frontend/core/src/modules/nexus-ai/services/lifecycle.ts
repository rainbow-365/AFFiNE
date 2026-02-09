import { Service } from '@toeverything/infra';

import { toast } from '../../../utils';
import type { DocsService, DocsStore } from '../../doc';
import { ChromaService } from './chroma';
import { DocProcessor } from './doc-processor';
import { EmbeddingService } from './embedding';
import { IdleService } from './idle';
import { NexusTaskService } from './task';
import { NexusTriggerService } from './trigger';

export class NexusLifecycleService extends Service {
  static autoStart = true;

  private readonly debounceTimers = new Map<string, any>();

  constructor(
    private readonly chroma: ChromaService,
    private readonly embedding: EmbeddingService,
    private readonly idle: IdleService,
    private readonly processor: DocProcessor,
    private readonly triggerService: NexusTriggerService,
    private readonly taskService: NexusTaskService,
    private readonly docsService: DocsService,
    private readonly docsStore: DocsStore
  ) {
    super();

    console.log('[NexusLifecycle] Constructor started');
    // Connect the pipeline
    if (this.idle && this.idle.idle$) {
      const sub = this.idle.idle$.subscribe(docId => {
        console.log(`[NexusLifecycle] Received idle event for doc: ${docId}`);
        this.handleIdle(docId).catch(console.error);
      });
      this.disposables.push(() => sub.unsubscribe());
    } else {
      console.error(
        '[NexusLifecycle] CRITICAL: idleService or idle$ is missing',
        this.idle
      );
    }
  }

  /**
   * Allow external callers to schedule processing with a built-in 3s debounce.
   * This keeps behaviour aligned with the idle listener even if slot events change.
   */
  scheduleProcess(docId: string, docStore?: any) {
    if (!docId) return;
    const existing = this.debounceTimers.get(docId);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.handleIdle(docId, docStore).catch(console.error);
    }, 3000);
    this.debounceTimers.set(docId, timer);
  }

  async handleIdle(docId: string, docStoreOverride?: any) {
    console.log(`[NexusLifecycle] Handling idle for ${docId}`);
    const docStore = docStoreOverride ?? this.docsStore.getBlockSuiteDoc(docId);
    if (!docStore) {
      console.warn(`[NexusLifecycle] Could not find doc store for ${docId}`);
      return;
    }

    const text = this.processor.extractText(docStore);
    console.log(`[NexusLifecycle] Extracted text length: ${text?.length || 0}`);
    if (!text) return;

    const docRecord = this.docsService.list.doc$(docId).value;
    const title = docRecord?.title$.value || 'Untitled';

    let vector: number[] | null = null;
    try {
      console.log(
        `[NexusLifecycle] Generating embedding for: "${text.substring(0, 50)}..."`
      );
      vector = await this.embedding.embed(text);
      if (vector) {
        console.log(
          `[NexusLifecycle] Embedding generated, dimension: ${vector.length}`
        );
      } else {
        console.warn(
          '[NexusLifecycle] Embedding unavailable, continuing without vector upsert'
        );
      }
    } catch (e) {
      console.error('[NexusLifecycle] Embedding threw an error', e);
    }

    if (vector?.length) {
      console.log(
        `[NexusLifecycle] Upserting to ChromaDB collection: nexus_collection`
      );
      const success = await this.chroma.upsert(
        'nexus_collection',
        docId,
        text,
        {
          updatedAt: Date.now(),
          title: title,
        },
        vector
      );

      if (success) {
        console.log(
          `[NexusLifecycle] Successfully synced doc ${docId} to ChromaDB`
        );
      } else {
        console.error(
          `[NexusLifecycle] Failed to upsert doc ${docId} to ChromaDB`
        );
      }
    } else {
      console.log(
        '[NexusLifecycle] Skipping ChromaDB upsert because embedding is missing'
      );
    }

    // Phase 2: Proactive Triggers
    console.log(`[NexusLifecycle] Extracting commitments...`);
    const commitments = await this.triggerService.extractCommitments(text);
    console.log(`[NexusLifecycle] Commitments found: ${commitments.length}`);
    if (commitments.length > 0) {
      toast(
        `NexusAI: Extracted ${commitments.length} task${commitments.length > 1 ? 's' : ''}`
      );
      commitments.forEach(c => {
        this.taskService.addTask(docId, c);
      });
    }
  }
}
