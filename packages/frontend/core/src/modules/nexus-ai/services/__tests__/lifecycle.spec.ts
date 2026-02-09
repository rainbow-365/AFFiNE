/* eslint-disable rxjs/finnish */
// @vitest-environment happy-dom

import { Framework } from '@toeverything/infra';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { DocsService, DocsStore } from '../../../doc';
import { ChromaService } from '../chroma';
import { DocProcessor } from '../doc-processor';
import { EmbeddingService } from '../embedding';
import { IdleService } from '../idle';
import { NexusLifecycleService } from '../lifecycle';
import { NexusTaskService } from '../task';
import type { Commitment } from '../trigger';
import { NexusTriggerService } from '../trigger';

vi.mock('../../../utils', () => ({
  toast: vi.fn(),
}));

const DOC_ID = 'doc-1';
const DOC_STORE = {};

const buildLifecycle = () => {
  const chroma = {
    upsert: vi.fn().mockResolvedValue(true),
  };

  const embedding = {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };

  const idle$ = new Subject<string>();
  const idle = { idle$ };

  const processor = {
    extractText: vi
      .fn()
      .mockReturnValue('I need to deploy the production build tomorrow.'),
  };

  const triggerService = {
    extractCommitments: vi
      .fn()
      .mockResolvedValue([
        { task: 'deploy the production build', dueDate: 'tomorrow' },
      ] satisfies Commitment[]),
  };

  const taskService = {
    addTask: vi.fn(),
  };

  const docsService = {
    list: {
      doc$: vi.fn().mockReturnValue({
        value: { title$: { value: 'Test Doc' } },
      }),
    },
  };

  const docsStore = {
    getBlockSuiteDoc: vi.fn().mockReturnValue(DOC_STORE),
  };

  const framework = Framework.EMPTY;
  framework.service(ChromaService, chroma as any);
  framework.service(EmbeddingService, embedding as any);
  framework.service(IdleService, idle as any);
  framework.service(DocProcessor, processor as any);
  framework.service(NexusTriggerService, triggerService as any);
  framework.service(NexusTaskService, taskService as any);
  framework.service(DocsService, docsService as any);
  framework.service(DocsStore, docsStore as any);

  framework.service(NexusLifecycleService, [
    ChromaService,
    EmbeddingService,
    IdleService,
    DocProcessor,
    NexusTriggerService,
    NexusTaskService,
    DocsService,
    DocsStore,
  ]);

  const provider = framework.provider();

  return {
    service: provider.get(NexusLifecycleService),
    chroma,
    embedding,
    processor,
    triggerService,
    taskService,
    docsStore,
  };
};

describe('NexusLifecycleService', () => {
  it('extracts commitments even when embeddings are unavailable', async () => {
    const {
      service,
      chroma,
      embedding,
      processor,
      triggerService,
      taskService,
    } = buildLifecycle();

    embedding.embed.mockResolvedValue(null);

    await (service as any).handleIdle(DOC_ID);

    expect(processor.extractText).toHaveBeenCalled();
    expect(triggerService.extractCommitments).toHaveBeenCalledWith(
      'I need to deploy the production build tomorrow.'
    );
    expect(taskService.addTask).toHaveBeenCalledWith(
      DOC_ID,
      expect.objectContaining({ task: 'deploy the production build' })
    );
    expect(chroma.upsert).not.toHaveBeenCalled();
  });

  it('upserts embeddings when available and still records tasks', async () => {
    const { service, chroma, embedding, triggerService, taskService } =
      buildLifecycle();

    embedding.embed.mockResolvedValue([0.1, 0.2, 0.3]);

    await (service as any).handleIdle(DOC_ID);

    expect(chroma.upsert).toHaveBeenCalledTimes(1);
    expect(triggerService.extractCommitments).toHaveBeenCalled();
    expect(taskService.addTask).toHaveBeenCalledWith(
      DOC_ID,
      expect.objectContaining({ task: 'deploy the production build' })
    );
  });
});
