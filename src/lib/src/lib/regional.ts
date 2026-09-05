export const SUPPORTED_REGIONAL_LOCALES = [
  "en-MY",
  "en-SG",
  "en-GB",
  "en-US",
  "zh-CN",
  "zh-TW",
] as const;

export type SupportedRegionalLocale = (typeof SUPPORTED_REGIONAL_LOCALES)[number];

export const REGIONAL_LOCALE_OPTIONS: ReadonlyArray<{
  value: SupportedRegionalLocale;
  label: string;
}> = [
  { value: "en-MY", label: "English (Malaysia)" },
  { value: "en-SG", label: "English (Singapore)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-US", label: "English (US)" },
  { value: "zh-CN", label: "中文（简体）" },
  { value: "zh-TW", label: "中文（繁體）" },
];

export const SUPPORTED_REGIONAL_TIME_ZONES = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
] as const;

export type SupportedRegionalTimeZone = (typeof SUPPORTED_REGIONAL_TIME_ZONES)[number];

export const REGIONAL_TIME_ZONE_OPTIONS: ReadonlyArray<{
  value: SupportedRegionalTimeZone;
  label: string;
}> = [
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (GMT+8)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Bangkok", label: "Bangkok (GMT+7)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (GMT+7)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Asia/Seoul", label: "Seoul (GMT+9)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "America/New_York", label: "New York" },
];
