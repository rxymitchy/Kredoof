export function firstNameOf(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (!first) return "there";
  if (first.length <= 2 || first.endsWith(".")) {
    return parts[1] || first.replace(/\./g, "") || "there";
  }
  return first;
}

export function hello(name?: string | null, at = new Date()): string {
  const hour = at.getHours();
  const who = firstNameOf(name);
  if (hour < 12) return `Good morning, ${who}`;
  if (hour < 17) return `Good afternoon, ${who}`;
  return `Good evening, ${who}`;
}
