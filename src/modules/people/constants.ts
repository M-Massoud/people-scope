export const ageBands = [
  { min: 0, max: 17, key: "0-17", label: "0–17", filterValue: "0-17" },
  { min: 18, max: 24, key: "18-24", label: "18–24", filterValue: "18-24" },
  { min: 25, max: 34, key: "25-34", label: "25–34", filterValue: "25-34" },
  { min: 35, max: 44, key: "35-44", label: "35–44", filterValue: "35-44" },
  { min: 45, max: 54, key: "45-54", label: "45–54", filterValue: "45-54" },
  { min: 55, max: 64, key: "55-64", label: "55–64", filterValue: "55-64" },
  { min: 65, max: 74, key: "65-74", label: "65–74", filterValue: "65-74" },
  { min: 75, max: 120, key: "75+", label: "75+", filterValue: "75-120" },
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
