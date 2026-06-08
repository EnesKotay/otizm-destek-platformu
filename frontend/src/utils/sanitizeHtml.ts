const ALLOWED_TAGS = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I']);

export function sanitizeHtml(html: string) {
  if (typeof document === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;

  const walk = (node: Node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!ALLOWED_TAGS.has(element.tagName)) {
          element.replaceWith(document.createTextNode(element.textContent || ''));
          return;
        }
        [...element.attributes].forEach(attr => element.removeAttribute(attr.name));
      }
      walk(child);
    });
  };

  walk(template.content);
  return template.innerHTML;
}

export function htmlToPlainText(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const template = document.createElement('template');
  template.innerHTML = sanitizeHtml(html);
  return template.content.textContent || '';
}
