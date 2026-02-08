import { type Framework } from '@toeverything/infra';

import { DocsService, DocsStore } from '../doc';
import { WorkspaceScope } from '../workspace';
import { ChromaService } from './services/chroma';
import { DocProcessor } from './services/doc-processor';
import { EmbeddingService } from './services/embedding';
import { IdleService } from './services/idle';
import { NexusLifecycleService } from './services/lifecycle';
import { OllamaService } from './services/ollama';
import { NexusTaskService } from './services/task';
import { NexusTriggerService } from './services/trigger';

export {
  ChromaService,
  DocProcessor,
  EmbeddingService,
  IdleService,
  NexusLifecycleService,
  NexusTaskService,
  NexusTriggerService,
  OllamaService,
};

export function configureNexusAIModule(framework: Framework) {
  framework
    .service(ChromaService)
    .service(OllamaService)
    .service(EmbeddingService)
    .service(IdleService)
    .service(DocProcessor, [IdleService])
    .service(NexusTriggerService, [OllamaService])
    .service(NexusTaskService)
    .scope(WorkspaceScope)
    .service(NexusLifecycleService, [
      ChromaService,
      EmbeddingService,
      IdleService,
      DocProcessor,
      NexusTriggerService,
      NexusTaskService,
      DocsService,
      DocsStore,
    ]);
}
