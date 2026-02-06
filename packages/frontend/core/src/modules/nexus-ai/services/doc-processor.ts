import { Service } from '@toeverything/infra';

import { IdleService } from './idle';

export class DocProcessor extends Service {
  constructor(private readonly idle: IdleService) {
    super();
  }

  /**
   * Extracts all text from a doc and returns it as a single string.
   * In a future version, this should handle chunking.
   */
  extractText(doc: any): string {
    if (!doc) {
      console.warn('[DocProcessor] doc is null or undefined');
      return '';
    }

    // Try to get blocks from various possible locations
    const rawBlocks = doc.blocks || doc.getBlocks?.() || [];

    // Convert to array safely
    let blocks: any[] = [];
    if (rawBlocks instanceof Map) {
      blocks = Array.from(rawBlocks.values());
    } else if (Array.isArray(rawBlocks)) {
      blocks = rawBlocks;
    } else if (typeof rawBlocks === 'object') {
      blocks = Object.values(rawBlocks);
    }

    console.log(`[DocProcessor] Extracting text from ${blocks.length} blocks`);
    let fullText = '';

    for (const block of blocks) {
      if (!block) continue;

      try {
        const model = block.model || block;
        if (!model) continue;

        console.log(
          `[DocProcessor] Processing block flavour: ${model.flavour}`,
          {
            hasText: !!model.text,
            hasPropsText: !!model.props?.text,
            propsKeys: Object.keys(model.props || {}),
          }
        );

        // BlockSuite blocks often have text in props.text or just model.text
        // It's usually a Y.Text or a BlockSuite Delta compatible object
        const textObj = model.text || model.props?.text;

        if (textObj) {
          // Handle both string and BlockSuite/Yjs text objects
          const str =
            typeof textObj === 'string' ? textObj : textObj.toString();
          if (str && str.trim()) {
            fullText += str + '\n';
          }
        }
      } catch (e) {
        console.warn('[DocProcessor] Error processing block:', e);
      }
    }

    const result = fullText.trim();
    console.log(`[DocProcessor] Final extracted text length: ${result.length}`);
    return result;
  }

  notifyChange(docId: string) {
    if (!docId) return;
    console.log(`[DocProcessor] notifyChange called for doc: ${docId}`);
    this.idle?.notifyChange(docId);
  }
}
