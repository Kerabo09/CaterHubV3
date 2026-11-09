import { msg } from '../shared/lib';
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);
export const mapUrl = (c) =>
  safeUrl(c.map_link) ||
  (c.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.address) : null);
export const copyLink = async (t) => {
  try {
    await navigator.clipboard.writeText(t);
    msg('Link copied');
  } catch {
    msg('Could not copy. Long-press the link to copy it.', 1);
  }
};
