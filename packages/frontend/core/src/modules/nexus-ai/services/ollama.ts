import { Service } from '@toeverything/infra';

export class OllamaService extends Service {
  private readonly baseUrl = '/api/ollama';

  async generate(model: string, prompt: string) {
    try {
      const resp = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error('Ollama generation failed');
      return await resp.json();
    } catch (e) {
      console.error('Ollama Service Error:', e);
      return null;
    }
  }

  async chat(model: string, messages: any[]) {
    try {
      const resp = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error('Ollama chat failed');
      return await resp.json();
    } catch (e) {
      console.error('Ollama Chat Error:', e);
      return null;
    }
  }

  async embeddings(model: string, prompt: string) {
    try {
      const resp = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
        }),
      });
      if (!resp.ok) throw new Error('Ollama embeddings failed');
      const data = await resp.json();
      return data.embedding;
    } catch (e) {
      console.error('Ollama Embeddings Error:', e);
      return null;
    }
  }

  async tags() {
    try {
      const resp = await fetch(`${this.baseUrl}/tags`);
      return await resp.json();
    } catch {
      return null;
    }
  }
}
