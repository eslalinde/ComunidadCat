import { parse } from 'yaml';

// electron-builder writes publisherName as an array in the installed app-update.yml.
export function getUpdatePublisher(configuration: string): string | undefined {
  const value: unknown = parse(configuration)?.publisherName;
  const names = Array.isArray(value) ? value : [value];
  const name: unknown = names[0];
  if (names.length === 1 && typeof name === 'string' && /(?:^|,\s*)CN=[^,]+/i.test(name)) {
    return name;
  }
}
