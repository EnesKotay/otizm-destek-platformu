import type { NavGroupConfig, NavItemConfig } from './navConfig';

export type BadgeValue = number | string | undefined;
export type BadgeMap = Partial<Record<NonNullable<NavItemConfig['badgeKey']>, number | string>>;

export function getBadgeLabel(value?: BadgeValue) {
  if (value === undefined || value === null || value === 0 || value === '') return null;
  if (typeof value === 'number') return value > 9 ? '9+' : String(value);
  return value;
}

export function getNumericBadgeValue(value?: BadgeValue) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.length > 0) return 1;
  return 0;
}

export function getGroupBadgeTotal(group: NavGroupConfig, badges: BadgeMap) {
  return group.items.reduce((sum, item) => sum + getNumericBadgeValue(item.badgeKey ? badges[item.badgeKey] : undefined), 0);
}

export function getDisabledReason(item: NavItemConfig, context: { hasChild: boolean; isExpertVerified: boolean }) {
  if (item.requiresChild && !context.hasChild) return 'Önce çocuk profili ekleyin';
  if (item.requiresVerifiedExpert && !context.isExpertVerified) return 'Uzman hesabı doğrulandıktan sonra açılır';
  return null;
}

export function flattenNavItems(groups: NavGroupConfig[]) {
  return groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterCommandItems<T extends { label: string; group: string; description?: string; keywords?: string[] }>(items: T[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  return items
    .map((item) => {
      const label = normalizeSearchText(item.label);
      const group = normalizeSearchText(item.group);
      const description = normalizeSearchText(item.description || '');
      const keywords = normalizeSearchText((item.keywords || []).join(' '));
      const haystack = `${label} ${group} ${description} ${keywords}`;
      let score = 0;

      if (label === normalizedQuery) score += 100;
      if (label.startsWith(normalizedQuery)) score += 60;
      if (label.includes(normalizedQuery)) score += 40;
      if (keywords.includes(normalizedQuery)) score += 32;
      if (description.includes(normalizedQuery)) score += 18;
      if (group.includes(normalizedQuery)) score += 10;

      return { item, score, matches: haystack.includes(normalizedQuery) };
    })
    .filter((entry) => entry.matches)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label, 'tr'))
    .map((entry) => entry.item);
}

export function moveSelection(current: number, direction: 1 | -1, itemCount: number) {
  if (itemCount <= 0) return 0;
  return (current + direction + itemCount) % itemCount;
}
