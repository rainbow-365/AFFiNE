import { Service } from '@toeverything/infra';

import { OllamaService } from './ollama';

export interface Commitment {
  task: string;
  owner?: string;
  dueDate?: string;
}

export class NexusTriggerService extends Service {
  private readonly model = 'gemma2:2b';

  private readonly patterns = [
    // I'll/I will do X [by Y]
    {
      regex:
        /(?:I'll|I will|Need to|TODO:?)\s+([\w\s]+?)(?:\s+by\s+([\w\s]+))?\.?$/i,
      handler: (match: RegExpMatchArray): Commitment => ({
        task: match[1].trim(),
        dueDate: match[2]?.trim(),
      }),
    },
    // Follow up with Person
    {
      regex: /(?:Follow up with)\s+([A-Z][a-z]+)/i,
      handler: (match: RegExpMatchArray): Commitment => ({
        task: `Follow up with ${match[1]}`,
        owner: match[1],
      }),
    },
  ];

  constructor(private readonly ollama: OllamaService) {
    super();
  }

  async extractCommitments(text: string): Promise<Commitment[]> {
    // 1. Try LLM first for sophistication
    try {
      const prompt = `Extract tasks/commitments from this text. 
Return ONLY a JSON array of objects with "task", "owner", and "dueDate" fields. 
If none found, return [].
Text: "${text}"`;

      const resp = await this.ollama.generate(this.model, prompt);
      if (resp?.response) {
        // Simple extraction of JSON from response
        const jsonMatch = resp.response.match(/\[.*\]/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.error(
        '[NexusTrigger] LLM Extraction failed, falling back to regex',
        e
      );
    }

    // 2. Fallback to regex
    const commitments: Commitment[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      for (const { regex, handler } of this.patterns) {
        const match = trimmed.match(regex);
        if (match) {
          commitments.push(handler(match));
          break;
        }
      }
    }

    return commitments;
  }
}
