import { Service } from '@toeverything/infra';

export interface Commitment {
  task: string;
  owner?: string;
  dueDate?: string;
}

export class NexusTriggerService extends Service {
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

  extractCommitments(text: string): Commitment[] {
    const commitments: Commitment[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      for (const { regex, handler } of this.patterns) {
        const match = trimmed.match(regex);
        if (match) {
          commitments.push(handler(match));
          break; // One match per line for now
        }
      }
    }

    return commitments;
  }
}
