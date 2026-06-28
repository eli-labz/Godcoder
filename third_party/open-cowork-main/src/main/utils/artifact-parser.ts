import { v4 as uuidv4 } from 'uuid';
import type { TraceStep } from '../../renderer/types';

export type ArtifactInfo = {
  path: string;
  name?: string;
  type?: string;
};

export type ArtifactParseResult = {
  cleanText: string;
  artifacts: ArtifactInfo[];
};

export function extractArtifactsFromText(text: string): ArtifactParseResult {
  if (!text) {
    return { cleanText: text, artifacts: [] };
  }

  // Create a fresh regex instance each call to avoid lastIndex state issues
  // with the stateful global flag across successive calls.
  const artifactBlockRegex = /```artifact\s*([\s\S]*?)```/g;
  const artifacts: ArtifactInfo[] = [];
  const cleanText = text.replace(artifactBlockRegex, (_match, jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        const record = item as Record<string, unknown>;
        const path = typeof record.path === 'string' ? record.path : '';
        if (!path) {
          continue;
        }
        const name = typeof record.name === 'string' ? record.name : undefined;
        const type = typeof record.type === 'string' ? record.type : undefined;
        artifacts.push({ path, name, type });
      }
    } catch {
      // 忽略无效的 JSON 块
    }
    return '';
  });

  return {
    cleanText: cleanText.replace(/\n{3,}/g, '\n\n').trimEnd(),
    artifacts,
  };
}

export function buildArtifactTraceSteps(
  artifacts: ArtifactInfo[],
  now: () => number = () => Date.now(),
  nextId: () => string = () => uuidv4()
): TraceStep[] {
  return artifacts.map((artifact) => ({
    id: nextId(),
    type: 'tool_result',
    status: 'completed',
    title: 'artifact',
    toolName: 'artifact',
    toolOutput: JSON.stringify(artifact),
    timestamp: now(),
  }));
}
