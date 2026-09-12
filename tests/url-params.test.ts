import { afterEach, describe, expect, it, vi } from "vitest";
import { updateUrlParams } from "@/lib";

function browserAt(href: string) {
  const entries = [href];
  let index = 0;
  vi.stubGlobal("window", {
    location: {
      get href() {
        return entries[index];
      },
    },
    history: {
      pushState: (_data: unknown, _unused: string, url: URL) => {
        entries.splice(++index, entries.length, url.toString());
      },
      replaceState: (_data: unknown, _unused: string, url: URL) => {
        entries[index] = url.toString();
      },
    },
  });
  return entries;
}

afterEach(() => vi.unstubAllGlobals());

describe("updateUrlParams", () => {
  it("pushes encoded changes while preserving unrelated parameters and the hash", () => {
    const entries = browserAt(
      "https://people.test/heatmap?view=age&tag=a&tag=b#people-explorer",
    );
    updateUrlParams({ country: "Bosnia & Herzegovina", gender: "female" });
    expect(entries).toEqual([
      "https://people.test/heatmap?view=age&tag=a&tag=b#people-explorer",
      "https://people.test/heatmap?view=age&tag=a&tag=b&country=Bosnia+%26+Herzegovina&gender=female#people-explorer",
    ]);
  });

  it("deletes null, empty, and all values without removing other filters", () => {
    const entries = browserAt(
      "https://people.test/geography?country=Canada&ageMin=18&gender=female&continent=Europe#chart",
    );
    updateUrlParams({ country: null, ageMin: "", gender: "all" });
    expect(entries.at(-1)).toBe(
      "https://people.test/geography?continent=Europe#chart",
    );
  });

  it("replaces the current entry when requested, including removing the final query key", () => {
    const entries = browserAt(
      "https://people.test/heatmap?search=Ann#people-explorer",
    );
    updateUrlParams({ search: "" }, true);
    expect(entries).toEqual(["https://people.test/heatmap#people-explorer"]);
  });
});
