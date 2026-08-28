/**
 * Shared rehype-sanitize schema for rendering AI output as Markdown.
 * Mirrors the schema used by the classic AI Terminal: blocks dangerous
 * HTML/JS while keeping common formatting tags and safe link protocols.
 */

import { defaultSchema } from 'rehype-sanitize';

export const agentSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'pre', 'code', 'blockquote', 'hr',
    'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title', 'target', 'rel'],
    code: ['className'],
    pre: ['className'],
    span: ['className'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
};
