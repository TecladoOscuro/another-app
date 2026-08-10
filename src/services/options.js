import { getCustomOptions, addCustomOption } from '../db.js';
import { PH_CATEGORIES, PH_SITES, DEVICES } from '../data/categories.js';

export const OPTION_KEYS = {
  category: 'category',
  site: 'site',
  device: 'device',
};

export async function getOptions(key) {
  const base = {
    [OPTION_KEYS.category]: PH_CATEGORIES,
    [OPTION_KEYS.site]: PH_SITES,
    [OPTION_KEYS.device]: DEVICES,
  }[key] || [];
  const custom = await getCustomOptions(key, []);
  return [...base, ...custom];
}

export async function appendCustomOption(key, value) {
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  const all = await getOptions(key);
  if (all.includes(trimmed)) return all;
  return addCustomOption(key, trimmed).then(() => all.concat(trimmed));
}
