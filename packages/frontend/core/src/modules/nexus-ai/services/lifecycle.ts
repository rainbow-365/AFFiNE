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

  private async handleIdle(docId: string) {
    console.log(`[NexusLifecycle] Handling idle for ${docId}`);
    const docStore = this.docsStore.getBlockSuiteDoc(docId);
    if (!docStore) {
      console.warn(`[NexusLifecycle] Could not find doc store for ${docId}`);
      return;
    }

    const text = this.processor.extractText(docStore);
    console.log(`[NexusLifecycle] Extracted text length: ${text?.length || 0}`);
    if (!text) return;

    console.log(
      `[NexusLifecycle] Generating embedding for: "${text.substring(0, 50)}..."`
    );
    const vector = await this.embedding.embed(text);
    if (!vector) {
      console.warn(
        '[NexusLifecycle] Embedding failed (returned null), skipping upsert'
      );
      return;
    }
    console.log(
      `[NexusLifecycle] Embedding generated, dimension: ${vector.length}`
    );

    const docRecord = this.docsService.list.doc$(docId).value;
    const title = docRecord?.title$.value || 'Untitled';

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
