import { Service } from '@toeverything/infra';
import { LiveData } from '@toeverything/infra';

export class ChromaService extends Service {
  // We'll use the ChromaDB REST API assuming it's running locally on 8000
  private readonly baseUrl = 'http://localhost:8000';

  constructor() {
    super();
  }

  async health() {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/heartbeat`);
      return resp.ok;
    } catch {
      return false;
    }
  }

  async query(collectionName: string, text: string, nResults: number = 5) {
    try {
      const resp = await fetch(
        `${this.baseUrl}/api/v1/collections/${collectionName}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query_texts: [text],
            n_results: nResults,
          }),
        }
      );
      if (!resp.ok) throw new Error('Query failed');
      return await resp.json();
    } catch (e) {
      console.error('ChromaDB Query Error:', e);
      return null;
    }
  }

  async upsert(
    collectionName: string,
    id: string,
    document: string,
    metadata: any
  ) {
    try {
      const resp = await fetch(
        `${this.baseUrl}/api/v1/collections/${collectionName}/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [id],
            documents: [document],
            metadatas: [metadata],
          }),
        }
      );
      return resp.ok;
    } catch (e) {
      console.error('ChromaDB Upsert Error:', e);
      return false;
    }
  }
}
