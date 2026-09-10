/** An anchor/hash change does not replace the document or need a loader. */
export function needsDocumentIndicator(href: string, currentHref: string): boolean {
  const current = new URL(currentHref);
  const target = new URL(href, current);
  return target.origin === current.origin &&
    (target.pathname !== current.pathname || target.search !== current.search);
}
