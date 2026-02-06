import { Service } from '@toeverything/infra';

import { OllamaService } from './ollama';

export class EmbeddingService extends Service {
  private readonly modelName = 'embeddinggemma:300m-qat-q4_0';

  constructor(private readonly ollama: OllamaService) {
    super();
  }

  async embed(text: string): Promise<number[] | null> {
    try {
      return await this.ollama.embeddings(this.modelName, text);
    } catch (e) {
      console.error('Embedding Error (Ollama):', e);
      return null;
    }
  }
}
