import { Service } from '@toeverything/infra';
import { env, pipeline } from '@xenova/transformers';

// Configure transformers.js to use local models
env.localModelPath = '/models/';
env.allowRemoteModels = false;

export class EmbeddingService extends Service {
  private extractor: any = null;

  private readonly modelName = 'all-MiniLM-L6-v2';

  constructor() {
    super();
  }

  private async getExtractor() {
    if (!this.extractor) {
      console.log(`[EmbeddingService] Loading model: ${this.modelName}`);
      this.extractor = await pipeline('feature-extraction', this.modelName);
    }
    return this.extractor;
  }

  async embed(text: string): Promise<number[] | null> {
    try {
      const extractor = await this.getExtractor();
      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true,
      });

      return Array.from(output.data);
    } catch (e) {
      console.error('[EmbeddingService] Local Embedding Error:', e);
      return null;
    }
  }
}
