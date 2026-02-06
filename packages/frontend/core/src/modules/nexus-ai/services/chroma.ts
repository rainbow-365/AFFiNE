import { Service } from '@toeverything/infra';

export class ChromaService extends Service {
  // Use the dev server proxy to avoid CORS. See tools/cli/src/bundle.ts for proxy config.
  // /api/chroma/* -> http://localhost:8000/api/v2/*
  private readonly baseUrl = '/api/chroma';
  private readonly collectionBaseUrl = `${this.baseUrl}/tenants/default_tenant/databases/default_database`;

  constructor() {
    super();
  }

  async health() {
    try {
      const resp = await fetch(`${this.baseUrl}/heartbeat`);
      return resp.ok;
    } catch {
      return false;
    }
  }

  async getOrCreateCollection(name: string) {
    try {
      // 1. Try to get
      const listResp = await fetch(`${this.collectionBaseUrl}/collections`);
      const collections = await listResp.json();
      const existing = collections.find((c: any) => c.name === name);
      if (existing) return existing.id;

      // 2. Create if missing
      const createResp = await fetch(`${this.collectionBaseUrl}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!createResp.ok) throw new Error('Create collection failed');
      const newCol = await createResp.json();
      return newCol.id;
    } catch (e) {
      console.error('ChromaDB Collection Error:', e);
      return null;
    }
  }

  async query(
    collectionName: string,
    text: string,
    vector?: number[],
    nResults: number = 5
  ) {
    try {
      const collectionId = await this.getOrCreateCollection(collectionName);
      if (!collectionId) throw new Error('Collection not found/created');

      const body: any = {
        n_results: nResults,
      };

      if (vector) {
        body.query_embeddings = [vector];
      } else {
        body.query_texts = [text];
      }

      const resp = await fetch(
        `${this.collectionBaseUrl}/collections/${collectionId}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
    metadata: any,
    vector?: number[]
  ) {
    try {
      const collectionId = await this.getOrCreateCollection(collectionName);
      if (!collectionId) throw new Error('Collection not found/created');

      const body: any = {
        ids: [id],
        documents: [document],
        metadatas: [metadata],
      };

      if (vector) {
        body.embeddings = [vector];
      }

      const resp = await fetch(
        `${this.collectionBaseUrl}/collections/${collectionId}/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      return resp.ok;
    } catch (e) {
      console.error('ChromaDB Upsert Error:', e);
      return false;
    }
  }
}
