import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Content split across MessageCard.tsx and the message/ sub-components directory
const messageCardPath = path.resolve(process.cwd(), 'src/renderer/components/MessageCard.tsx');
const messageDir = path.resolve(process.cwd(), 'src/renderer/components/message');
const messageCardContent = [
  fs.readFileSync(messageCardPath, 'utf8'),
  ...fs.readdirSync(messageDir).map((f) => fs.readFileSync(path.join(messageDir, f), 'utf8')),
].join('\n');

describe('AskUserQuestion UI rendering', () => {
  it('renders AskUserQuestionBlock as read-only for historical messages', () => {
    expect(messageCardContent).toContain('function AskUserQuestionBlock');
    expect(messageCardContent).toContain('read-only display for historical messages');
    // No interactive state — no submit, no selections, no pending check
    expect(messageCardContent).not.toContain('respondToQuestion');
    expect(messageCardContent).not.toContain('pendingQuestion');
    expect(messageCardContent).not.toContain('handleSubmit');
  });

  it('still renders question options for display', () => {
    expect(messageCardContent).toContain('getOptionLetter');
    expect(messageCardContent).toContain('QuestionItem');
  });
});
