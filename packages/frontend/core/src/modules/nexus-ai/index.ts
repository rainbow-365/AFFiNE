import { type Framework } from '@toeverything/infra';

import { DocsService } from '../doc';
import { ChromaService } from './services/chroma';
import { DocProcessor } from './services/doc-processor';
import { EmbeddingService } from './services/embedding';
import { IdleService } from './services/idle';
import { NexusLifecycleService } from './services/lifecycle';

export {
  ChromaService,
  DocProcessor,
  EmbeddingService,
  IdleService,
  NexusLifecycleService,
};

export function configureNexusAIModule(framework: Framework) {
  framework
    .service(ChromaService)
    .service(EmbeddingService)
    .service(IdleService)
    .service(DocProcessor)
    .service(NexusLifecycleService, [
      ChromaService,
      EmbeddingService,
      IdleService,
      DocProcessor,
      DocsService,
    ]);
}
