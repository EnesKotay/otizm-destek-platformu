import { cn } from '@/utils/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  textareaClassName?: string;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

function htmlToText(value: string) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(value: string) {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
  className,
  textareaClassName,
}: RichTextEditorProps) {
  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white transition-all focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/10', className)}>
      <textarea
        value={htmlToText(value)}
        onChange={event => {
          onChange(textToHtml(event.target.value));
        }}
        rows={rows}
        placeholder={placeholder}
        className={cn('min-h-40 w-full resize-y rounded-2xl bg-transparent px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400', textareaClassName)}
      />
    </div>
  );
}
