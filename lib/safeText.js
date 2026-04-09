// PATCH: utils/safeText.js

export function safeText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.headline || value.detail || '';
}
