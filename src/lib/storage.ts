// LocalStorage helpers — all data lives in the browser
export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const v = window.localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

export const KEYS = {
  user: "arogyasathi.user",
  users: "arogyasathi.users",
  chat: "arogyasathi.chat",
  detections: "arogyasathi.detections",
  reports: "arogyasathi.reports",
  theme: "arogyasathi.theme",
};
