import { toast } from '@affine/component';
import { Service } from '@toeverything/infra';

import { DocsService, DocsStore } from '../../doc';
import { ChromaService } from './chroma';
import { DocProcessor } from './doc-processor';
import { EmbeddingService } from './embedding';
import { IdleService } from './idle';
import { NexusTriggerService } from './trigger';

export class NexusLifecycleService extends Service {
  constructor(
    private readonly chroma: ChromaService,
    private readonly embedding: EmbeddingService,
    private readonly idle: IdleService,
    private readonly processor: DocProcessor,
    private readonly triggerService: NexusTriggerService,
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
    if (!text) return;

    const vector = await this.embedding.embed(text);
    if (!vector) {
      // Fallback or log
      console.warn('Embedding failed, skipping upsert');
      return;
    }

    await this.chroma.upsert('nexus_collection', docId, text, {
      updatedAt: Date.now(),
      title: doc.title$.value,
    });

    // Phase 2: Proactive Triggers
    const commitments = this.triggerService.extractCommitments(text);
    if (commitments.length > 0) {
      commitments.forEach(c => {
        toast(
          `Detected Task: ${c.task}${c.dueDate ? ` (by ${c.dueDate})` : ''}`
        );
      });
    }

    console.log(`Successfully synced doc ${docId} to ChromaDB`);
  }
}
