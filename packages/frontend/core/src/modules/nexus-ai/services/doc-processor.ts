import { Service } from '@toeverything/infra';

import { IdleService } from './idle';

export class DocProcessor extends Service {
  constructor(private readonly idle: IdleService) {
    super();
  }

  private extractTextFromModel(model: any): string {
    if (!model) return '';
    const parts: string[] = [];

    const textObj = model.text ?? model.props?.text;
    if (textObj) {
      const str = typeof textObj === 'string' ? textObj : textObj.toString();
      if (str && str.trim()) {
        parts.push(str.trim());
      }
    }

    const rawChildren = model.children ?? model.props?.children;
    let children: any[] = [];
    if (Array.isArray(rawChildren)) {
      children = rawChildren;
    } else if (rawChildren instanceof Map) {
      children = Array.from(rawChildren.values());
    } else if (rawChildren && typeof rawChildren === 'object') {
      children = Object.values(rawChildren);
    }

    for (const child of children) {
      const childModel = child?.model ?? child;
      const childText = this.extractTextFromModel(childModel);
      if (childText) {
        parts.push(childText);
      }
    }

    return parts.join('\n');
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

    let fullText = '';

    // Prefer blocks by flavour for reliable structure in runtime/tests.
    if (doc.getBlocksByFlavour) {
      const notes = doc.getBlocksByFlavour('affine:note') ?? [];
      console.log(
        `[DocProcessor] Extracting text from ${notes.length} note blocks`
      );
      for (const note of notes) {
        const noteModel = note?.model ?? note;
        const noteText = this.extractTextFromModel(noteModel);
        if (noteText) {
          fullText += noteText + '\n';
        }
      }
    }

    // Fallback to raw block map if needed.
    if (!fullText.trim()) {
      const rawBlocks = doc.blocks || doc.getBlocks?.() || [];
      let blocks: any[] = [];
      if (rawBlocks instanceof Map) {
        blocks = Array.from(rawBlocks.values());
      } else if (Array.isArray(rawBlocks)) {
        blocks = rawBlocks;
      } else if (typeof rawBlocks === 'object') {
        blocks = Object.values(rawBlocks);
      }

      console.log(
        `[DocProcessor] Extracting text from ${blocks.length} blocks`
      );
      for (const block of blocks) {
        if (!block) continue;
        try {
          const model = block.model ?? block;
          if (!model) continue;
          const text = this.extractTextFromModel(model);
          if (text) {
            fullText += text + '\n';
          }
        } catch (e) {
          console.error('[DocProcessor] Error processing block:', e);
        }
      }
    }

    const result = fullText.trim();
    console.error(
      `[DocProcessor] Final extracted text length: ${result.length}`
    );
    console.error(
      `[DocProcessor] Extracted Text Content: "${result.substring(0, 100)}..."`
    );
    return result;
  }

  notifyChange(docId: string) {
    if (!docId) return;
    console.log(`[DocProcessor] notifyChange called for doc: ${docId}`);
    this.idle?.notifyChange(docId);
  }
}
