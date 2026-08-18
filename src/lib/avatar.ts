export const avatarColors = [
  { value: "teal", label: "Travel teal", background: "#0f766e", foreground: "#ffffff" },
  { value: "amber", label: "Golden hour", background: "#f59e0b", foreground: "#3d2a00" },
  { value: "ocean", label: "Ocean blue", background: "#2563eb", foreground: "#ffffff" },
  { value: "coral", label: "Coral", background: "#e76f51", foreground: "#ffffff" },
  { value: "violet", label: "Violet", background: "#7c3aed", foreground: "#ffffff" },
  { value: "forest", label: "Forest", background: "#15803d", foreground: "#ffffff" },
  { value: "rose", label: "Rose", background: "#e11d48", foreground: "#ffffff" },
  { value: "slate", label: "Slate", background: "#475569", foreground: "#ffffff" },
] as const;

export const avatarIcons = [
  { value: "initial", label: "Initial", symbol: "" },
  { value: "plane", label: "Plane", symbol: "✈" },
  { value: "meal", label: "Meal", symbol: "🍜" },
  { value: "pin", label: "Pin", symbol: "⌖" },
  { value: "luggage", label: "Luggage", symbol: "🧳" },
  { value: "palm", label: "Palm", symbol: "🌴" },
  { value: "coffee", label: "Coffee", symbol: "☕" },
  { value: "camera", label: "Camera", symbol: "📷" },
] as const;

export type AvatarColor = (typeof avatarColors)[number]["value"];
export type AvatarIcon = (typeof avatarIcons)[number]["value"];

export function getAvatarColor(value: string) {
  return avatarColors.find((color) => color.value === value) ?? avatarColors[0];
}

export function getAvatarSymbol(value: string, name: string): string {
  const icon = avatarIcons.find((item) => item.value === value) ?? avatarIcons[0];

  if (icon.value === "initial") {
    return name.trim().charAt(0).toUpperCase() || "U";
  }

  return icon.symbol;
}
