import type { Plan } from '@/types';

const PHASE_RE = /PHASE\s+\d+\s*:\s*(.+)/gi;
const STEP_RE = /(?:-|\u2022)\s*(.+)/g;

export const planParser = {
  parse(content: string): { hasPlan: boolean } {
    return { hasPlan: /execution plan|phase\s+\d+/i.test(content) };
  },

  extractPlan(content: string): Plan {
    const phaseMatches = [...content.matchAll(PHASE_RE)];
    const steps = [...content.matchAll(STEP_RE)].map((m, idx) => ({
      id: `s-${idx + 1}`,
      description: m[1].trim(),
    }));

    const phases =
      phaseMatches.length > 0
        ? phaseMatches.map((m, idx) => ({
            id: `p-${idx + 1}`,
            title: m[1].trim(),
            estimatedTime: 10,
            steps: steps.slice(idx * 3, idx * 3 + 3),
          }))
        : [
            {
              id: 'p-1',
              title: 'Execution',
              estimatedTime: 15,
              steps: steps.length ? steps : [{ id: 's-1', description: 'Complete task' }],
            },
          ];

    return {
      id: crypto.randomUUID(),
      estimatedTime: phases.reduce((sum, p) => sum + p.estimatedTime, 0),
      approved: false,
      phases,
    };
  },
};
