import { FullPageLink as Link } from "@/components/FullPageLink";

export function SectionTabs({ label, selected, items }: { label: string; selected: string; items: Array<{ key: string; label: string; href: string }> }) {
  return <nav className="section-tabs" aria-label={label}>{items.map(item => <Link key={item.key} href={item.href} aria-current={selected === item.key ? "page" : undefined}>{item.label}</Link>)}</nav>;
}
