import Link from "next/link";
import { Users } from "lucide-react";
const pages = [
  { id: "registrations", href: "/", name: "Registrations" },
  { id: "ages", href: "/ages", name: "Age groups" },
  { id: "demographics", href: "/demographics", name: "Demographics" },
  { id: "countries", href: "/countries", name: "Geography" },
  { id: "comparison", href: "/comparison", name: "Compare countries" },
  { id: "heatmap", href: "/heatmap", name: "Heatmap" },
] as const;
type PageKind = (typeof pages)[number]["id"];

export function Shell({
  children,
  active,
  queryString = "",
}: {
  children: React.ReactNode;
  active?: PageKind;
  queryString?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link className="wordmark" href="/">
            <Users size={21} />
            PeopleScope<span>People analytics</span>
          </Link>
        </div>
        <nav aria-label="Main navigation">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={
                page.href +
                (queryString &&
                page.id !== "comparison" &&
                page.id !== "heatmap"
                  ? `?${queryString}`
                  : "")
              }
              aria-current={active === page.id ? "page" : undefined}
            >
              {page.name}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="app-footer">
        <span>PeopleScope · People analytics</span>
        <a
          href="https://randomuser.me/documentation"
          target="_blank"
          rel="noreferrer"
        >
          Random User documentation ↗
        </a>
      </footer>
    </>
  );
}
