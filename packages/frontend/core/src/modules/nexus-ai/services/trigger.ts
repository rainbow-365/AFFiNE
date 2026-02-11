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
        /(?:I'll|I will|I need to|We need to|Need to|I have to|We have to|Must|I must|Should|TODO:?|To do)\s+(.{5,120}?)(?:\s+by\s+([\w\s]{3,40}))?[.!?]?$/i,
      handler: (match: RegExpMatchArray): Commitment => ({
        task: match[1].trim(),
        dueDate: match[2]?.trim(),
      }),
    },
    // Follow up with Person
    {
      regex: /(?:Follow up with|Contact|Call|Email|Message)\s+([A-Z][a-z]+)/i,
      handler: (match: RegExpMatchArray): Commitment => ({
        task: `Follow up with ${match[1]}`,
        owner: match[1],
      }),
    },
    // Schedule/Meeting
    {
      regex:
        /(?:Schedule|Organize|Set up)\s+(?:a\s+)?([\w\s]+?)(?:\s+(?:at|on|for)\s+([\w\s]+))?$/i,
      handler: (match: RegExpMatchArray): Commitment => ({
        task: `Schedule ${match[1].trim()}`,
        dueDate: match[2]?.trim(),
      }),
    },
  ];

  constructor(private readonly ollama: OllamaService) {
    super();
  }

  async extractCommitments(text: string): Promise<Commitment[]> {
    // 1. Prefer regex for deterministic extraction (fast + stable in tests)
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

    if (commitments.length) {
      return commitments;
    }

    // 2. Fallback to LLM for sophisticated extraction
    try {
      const prompt = `You are a productivity assistant. Extract actionable tasks/commitments from this text.
Return ONLY a JSON array of objects with "task", "owner", and "dueDate" fields. 
Be concise. If no tasks found, return [].

Text: "${text.substring(0, 1000)}"`;

      const resp = await this.ollama.generate(this.model, prompt);
      if (resp?.response) {
        const jsonMatch = resp.response.match(/\[.*\]/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.error('[NexusTrigger] LLM Extraction failed', e);
    }

    return [];
  }
}
