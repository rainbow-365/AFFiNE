import { Service } from '@toeverything/infra';
import { env,pipeline } from '@xenova/transformers';

// Configure transformers.js to use local models
// In a browser environment, this points to the serving path (e.g., /models/)
// We assume models are served from /models in the public directory
env.allowLocalModels = true;
env.useBrowserCache = false; // We use our own file storage or rely on serving
// env.localModelPath = '/models/'; // This is the default prefix for local fetches if allowLocalModels is true, but let's be explicit if needed or just use the pipeline path.

export class EmbeddingService extends Service {
  private pipe: any = null;
  private readonly modelName = 'all-MiniLM-L6-v2'; // Folder name in public/models

  constructor() {
    super();
    // Configure path specifically for this instance if needed,
    // but globally setting env before first pipeline call is key.
    env.localModelPath = '/models/';
  }

  async init() {
    if (this.pipe) return;

    // 'feature-extraction' task
    // model name 'all-MiniLM-L6-v2' implies it looks for /models/all-MiniLM-L6-v2/
    this.pipe = await pipeline('feature-extraction', this.modelName, {
      quantized: true,
      local_files_only: true, // Force local fetch, fail if not found (ensures we aren't hitting HF)
    });
  }

  async embed(text: string): Promise<number[] | null> {
    try {
      if (!this.pipe) {
        await this.init();
      }

      // Generate embedding
      // pooling: 'mean' and normalize: true are standard for sentence-transformers
      const output = await this.pipe(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert Tensor to standard array
      return Array.from(output.data);
    } catch (e) {
      console.error('Embedding Error:', e);
      return null;
    }
  }
}
