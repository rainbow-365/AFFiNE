import { Service } from '@toeverything/infra';

import { DocsService } from '../../doc';
import { ChromaService } from './chroma';
import { DocProcessor } from './doc-processor';
import { EmbeddingService } from './embedding';
import { IdleService } from './idle';

export class NexusLifecycleService extends Service {
  constructor(
    private readonly chroma: ChromaService,
    private readonly embedding: EmbeddingService,
    private readonly idle: IdleService,
    private readonly processor: DocProcessor,
    private readonly docsService: DocsService
  ) {
    super();

    // Connect the pipeline
    const sub = this.idle.idle$.subscribe(docId => {
      this.handleIdle(docId).catch(console.error);
    });
    this.disposables.push(() => sub.unsubscribe());
  }

  private async handleIdle(docId: string) {
    const doc = this.docsService.list.docsMap$.value.get(docId);
    if (!doc) return;

    const text = this.processor.extractText(doc);
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

    console.log(`Successfully synced doc ${docId} to ChromaDB`);
  }
}
