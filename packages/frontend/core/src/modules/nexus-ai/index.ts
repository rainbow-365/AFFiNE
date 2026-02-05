import { type Framework } from '@toeverything/infra';

import { DocsService, DocsStore } from '../doc';
import { WorkspaceScope } from '../workspace';
import { ChromaService } from './services/chroma';
import { DocProcessor } from './services/doc-processor';
import { EmbeddingService } from './services/embedding';
import { IdleService } from './services/idle';
import { NexusLifecycleService } from './services/lifecycle';
import { NexusTriggerService } from './services/trigger';

export {
  ChromaService,
  DocProcessor,
  EmbeddingService,
  IdleService,
  NexusLifecycleService,
  NexusTriggerService,
};

export function configureNexusAIModule(framework: Framework) {
  framework
    .service(ChromaService)
    .service(EmbeddingService)
    .service(IdleService)
    .service(DocProcessor, [IdleService])
    .service(NexusTriggerService)
    .scope(WorkspaceScope)
    .service(NexusLifecycleService, [
      ChromaService,
      EmbeddingService,
      IdleService,
      DocProcessor,
      NexusTriggerService,
      DocsService,
      DocsStore,
    ]);
}
