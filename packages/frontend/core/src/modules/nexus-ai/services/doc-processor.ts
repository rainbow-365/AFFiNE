import { Service } from '@toeverything/infra';

import type { DocRecord } from '../../doc';

export class DocProcessor extends Service {
  constructor(private readonly idle: IdleService) {
    super();
  }

  /**
   * Extracts all text from a doc and returns it as a single string.
   * In a future version, this should handle chunking.
   */
  extractText(doc: any): string {
    if (!doc || typeof doc.getBlocks !== 'function') {
      return '';
    }
    const blocks = doc.getBlocks();
    let fullText = '';

    for (const block of blocks) {
      // Check for 'text' prop in block model
      const text = block.model.props.text;
      if (text && typeof text.toString === 'function') {
        fullText += text.toString() + '\n';
      }
    }

    return fullText.trim();
  }

  notifyChange(docId: string) {
    console.log(`[DocProcessor] notifyChange called for doc: ${docId}`);
    this.idle.notifyChange(docId);
  }
}
