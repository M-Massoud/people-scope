import { PAGES, type PageId } from "@/config";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "./ui";
import {
  Users,
  ChartNoAxesColumn,
  CalendarDays,
  Globe2,
  Layers,
  Map,
  Scale,
} from "lucide-react";
const icons = {
  "profile-timeline": CalendarDays,
  "age-groups": ChartNoAxesColumn,
  "age-gender": Layers,
  geography: Globe2,
  "compare-countries": Scale,
  heatmap: Map,
};
const pages = (Object.keys(PAGES) as PageId[]).map((id) => ({
  id,
  ...PAGES[id],
  icon: icons[id],
}));

export function Shell({
  children,
  active,
  queryString = "",
}: {
  children: React.ReactNode;
  active?: PageId;
  queryString?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link className="wordmark" href={PAGES["profile-timeline"].href}>
            <span className="brand-symbol">
              <Users size={21} aria-hidden="true" />
            </span>
            PeopleScope<span>People analytics</span>
          </Link>
        </div>
        <div className="header-navigation">
          <ScrollArea>
            <nav aria-label="Main navigation">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={
                    page.href +
                    (queryString &&
                    page.id !== "compare-countries" &&
                    page.id !== "heatmap"
                      ? `?${queryString}`
                      : "")
                  }
                  aria-current={active === page.id ? "page" : undefined}
                >
                  <page.icon size={16} aria-hidden="true" />
                  {page.title}
                </Link>
              ))}
            </nav>
            <ScrollBar
              orientation="horizontal"
              className="data-horizontal:h-1.5"
            />
          </ScrollArea>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="app-footer">
        <span>PeopleScope · People analytics</span>
        <span className="max-w-md leading-relaxed">
          Fictional profiles provided by{" "}
          <a
            href="https://randomuser.me/documentation"
            target="_blank"
            rel="noreferrer"
            aria-label="Random User documentation"
            className="underline underline-offset-4"
          >
            Random User
          </a>
          . Built for learning and demonstration purposes.
        </span>
      </footer>
    </>
  );
}
