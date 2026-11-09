// Settings kept on this device. Blocked storage just means the defaults.
const KEY = "vibes-settings";

export function load(defaults) {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...defaults };
  }
}

export function save(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked: the setting lasts until the page closes.
  }
}
