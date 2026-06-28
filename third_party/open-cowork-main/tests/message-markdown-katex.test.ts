import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MessageMarkdown } from '../src/renderer/components/MessageMarkdown';

describe('MessageMarkdown KaTeX rendering', () => {
  it('renders inline math as KaTeX markup', () => {
    const html = renderToStaticMarkup(
      React.createElement(MessageMarkdown, { normalizedText: '$E=mc^2$' })
    );

    expect(html).toContain('katex');
    expect(html).toContain('katex-html');
    expect(html).not.toContain('$E=mc^2$');
  });

  it('renders display math as KaTeX markup', () => {
    const html = renderToStaticMarkup(
      React.createElement(MessageMarkdown, { normalizedText: '$$\n\\int_0^1 f(x)dx\n$$' })
    );

    expect(html).toContain('katex-display');
    expect(html).toContain('katex');
    expect(html).not.toContain('$$\n\\int_0^1 f(x)dx\n$$');
  });
});
