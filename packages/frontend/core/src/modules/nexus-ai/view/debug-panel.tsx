import { useService } from '@toeverything/infra';
import { useState } from 'react';

import { ChromaService } from '../services/chroma';
import { EmbeddingService } from '../services/embedding';
export const NexusDebugPanel = () => {
  const chroma = useService(ChromaService);
  const embedding = useService(EmbeddingService);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const vector = await embedding.embed(query);
      if (!vector || vector.length === 0) {
        console.error(
          '[NexusAI] Embedding unavailable. Run `yarn setup:models` to download the local ONNX model.'
        );
        setResults(['Embedding unavailable (model missing?).']);
        return;
      }

      const data = await chroma.query('nexus_collection', query, vector);
      setResults(data?.documents?.[0] || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '300px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 9999,
        fontSize: '12px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0' }}>NexusAI Debug Search</h3>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search vectors..."
        style={{ width: '100%', marginBottom: '8px', padding: '4px' }}
      />
      <button
        onClick={() => {
          handleSearch().catch(console.error);
        }}
        disabled={loading}
        style={{ width: '100%', marginBottom: '12px' }}
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
      <div>
        <strong>Results:</strong>
        <ul style={{ paddingLeft: '16px', marginTop: '8px' }}>
          {results.map((res: string, i: number) => (
            <li key={i}>{res}</li>
          ))}
          {results.length === 0 && !loading && <li>No results</li>}
        </ul>
      </div>
    </div>
  );
};
