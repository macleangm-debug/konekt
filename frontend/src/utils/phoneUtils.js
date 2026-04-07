import AFRICAN_PHONE_PREFIXES from "../config/africanPhonePrefixes";

const sortedPrefixes = [...AFRICAN_PHONE_PREFIXES]
  .sort((a, b) => b.prefix.length - a.prefix.length);

export function splitPhone(combined, defaultPrefix = "+255") {
  if (!combined) return { prefix: defaultPrefix, number: "" };
  for (const { prefix } of sortedPrefixes) {
    if (combined.startsWith(prefix)) {
      return { prefix, number: combined.slice(prefix.length) };
    }
  }
  return { prefix: defaultPrefix, number: combined };
}

export function combinePhone(prefix, number) {
  return number ? `${prefix}${number}` : "";
}
