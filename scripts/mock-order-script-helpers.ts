import path from "node:path";
import { fileURLToPath } from "node:url";

function readFlagValue(argv: string[], flagName: string): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === flagName) {
      return argv[index + 1];
    }

    if (argument.startsWith(`${flagName}=`)) {
      return argument.slice(flagName.length + 1);
    }
  }

  return undefined;
}

export function hasFlag(argv: string[], flagName: string): boolean {
  return argv.includes(flagName);
}

export function readStringFlag(argv: string[], flagName: string): string | undefined {
  return readFlagValue(argv, flagName);
}

export function readPositiveIntegerFlag(argv: string[], flagName: string): number | undefined {
  const value = readFlagValue(argv, flagName);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  return parsed;
}

function resolveScriptSiblingPath(metaUrl: string, fileName: string): string {
  const currentDirectory = path.dirname(fileURLToPath(metaUrl));

  return path.join(currentDirectory, fileName);
}

export function resolveMockOrdersSourceFilePath(
  metaUrl: string,
  providedSourceFilePath?: string
): string {
  return path.resolve(providedSourceFilePath ?? resolveScriptSiblingPath(metaUrl, "mock_orders.json"));
}
