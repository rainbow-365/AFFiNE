import { Service } from '@toeverything/infra';

import type { Doc } from '../../doc';

export class DocProcessor extends Service {
  constructor() {
    super();
  }

  /**
   * Extracts all text from a doc and returns it as a single string.
   * In a future version, this should handle chunking.
   */
  extractText(doc: Doc): string {
    const blocks = doc.blockSuiteDoc.getBlocks();
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
}
