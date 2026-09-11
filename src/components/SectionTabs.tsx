import { FullPageLink as Link } from "@/components/FullPageLink";
import { appDestination } from "@/lib/app-destinations";

export function SectionTabs({ label, selected, items, tripId }: { label: string; selected: string; tripId?: string; items: Array<{ key: string; label: string; href: string }> }) {
  return <nav className="section-tabs" aria-label={label}>{items.map(item => <Link key={item.key} href={appDestination(item.href, tripId)} aria-current={selected === item.key ? "page" : undefined}>{item.label}</Link>)}</nav>;
}
