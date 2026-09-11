export const ageBands = [
  [0, 17],
  [18, 24],
  [25, 34],
  [35, 44],
  [45, 54],
  [55, 64],
  [65, 74],
  [75, 120],
] as const;

export const FILTER_KEYS = [
  "continent",
  "from",
  "to",
  "country",
  "gender",
  "ageMin",
  "ageMax",
];
export const PEOPLE_KEYS = ["search", "sort", "page", "pageSize"];
