import type { Category } from "@/types/group";

const GLOBAL_KEYWORD_BLACKLIST = [
  "hotel",
  "boarding",
  "lodging",
  "motel",
  "inn",
];

const COFFEE_NEGATIVE_KEYWORDS = [
  ...GLOBAL_KEYWORD_BLACKLIST,
  "brewery",
  "brewpub",
  "bar",
  "pub",
  "taproom",
  "tavern",
  "distillery",
  "winery",
  "night club",
  "nightclub",
  "lounge",
];

const FOOD_NEGATIVE_KEYWORDS = [
  ...GLOBAL_KEYWORD_BLACKLIST,
  "brewery",
  "brewpub",
  "taproom",
  "distillery",
  "winery",
  "night club",
  "nightclub",
];

const ALCOHOL_NEGATIVE_KEYWORDS = [
  ...GLOBAL_KEYWORD_BLACKLIST,
  "cafe",
  "bakery",
  "tea house",
  "coffee",
  "boba",
];

const NEGATIVE_KEYWORDS_BY_CATEGORY: Record<Category, string[]> = {
  coffee: COFFEE_NEGATIVE_KEYWORDS,
  food: FOOD_NEGATIVE_KEYWORDS,
  alcohol: ALCOHOL_NEGATIVE_KEYWORDS,
};

export function isPlaceNameAllowed(category: Category, placeName: string): boolean {
  const normalizedName = placeName.trim().toLowerCase();
  if (!normalizedName) return false;

  const negativeKeywords = NEGATIVE_KEYWORDS_BY_CATEGORY[category] ?? [];
  return !negativeKeywords.some((keyword) => normalizedName.includes(keyword));
}
