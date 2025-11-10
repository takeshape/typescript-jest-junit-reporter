import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { findUp } from 'find-up';
import { create } from 'xmlbuilder';

const { TEST_TIMESTAMP } = process.env;

interface CompilerError {
  filename: string;
  line: number;
  col: number;
  code: string;
  message: string;
  specificMessage: string;
  source: [string, string];
}

interface Parser {
  errors: CompilerError[];
  parse: (lines: string[]) => void;
}

async function main(input: Readable, output: Writable): Promise<number> {
  if (process.stdin.isTTY) {
    throw new Error('expected input to be piped in');
  }

  const name = await getPackageName();

  const parser = newParser();

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  let errorLines: string[] = [];

  for await (const line of rl) {
    if (errorLines.length === 1) {
      parser.parse([...errorLines, line]);
      errorLines = [];
    } else {
      errorLines.push(line);
    }
  }

  const xml = toJunit(name, parser.errors);
  output.write(xml + '\n');

  return parser.errors.length ? 1 : 0;
}

async function getPackageName(): Promise<string> {
  try {
    const pkgPath = await findUp('package.json');
    if (!pkgPath) {
      throw new Error('Could not find package.json');
    }
    const pkgStr = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgStr) as { name: string };
    return pkg.name;
  } catch {
    return 'Unknown Package';
  }
}

// We only handle the format without --pretty right now
const UGLY_REGEX =
  /^(?<file>.+?)\((?<line>\d+),(?<col>\d+)\): error (?<code>\S+?): (?<message>.+)$/;

function newParser(): Parser {
  const errors: CompilerError[] = [];

  function parse([line1, line2]: string[]): void {
    const match = UGLY_REGEX.exec(line1);

    if (match?.groups) {
      errors.push({
        filename: path.resolve(match.groups.file),
        line: Number(match.groups.line),
        col: Number(match.groups.col),
        code: match.groups.code,
        message: match.groups.message,
        specificMessage: line2,
        source: [line1, line2]
      });
    }
  }

  return { errors, parse };
}

function getFailureText({
  filename,
  line,
  col,
  code,
  message,
  specificMessage
}: CompilerError): string {
  return `error ${code}: ${message}
${specificMessage}
    at (${filename}:${line}:${col})`;
}

function toJunit(name: string, errors: CompilerError[]): string {
  const timestamp = TEST_TIMESTAMP ? parseInt(TEST_TIMESTAMP, 10) : Date.now();

  const obj = {
    testsuites: {
      '@name': name,
      '@tests': errors.length,
      '@failures': errors.length,
      '@errors': 0,
      '@time': 0,
      testsuite: {
        '@name': 'type errors',
        '@tests': errors.length,
        '@failures': errors.length,
        '@errors': 0,
        '@time': 0,
        '@timestamp': new Date(timestamp).toISOString().split('.')[0],
        testcase: errors.length
          ? errors.map((err) => ({
              '@name': err.message,
              '@classname': err.code,
              failure: {
                '#text': getFailureText(err)
              }
            }))
          : {
              '@name': 'no errors reported',
              '@classname': 'no errors reported'
            }
      }
    }
  };

  return create(obj).end({ pretty: true, allowEmpty: true });
}

main(process.stdin, process.stdout)
  .catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error('ERROR: ' + err.message);
    return 1;
  })
  .then((code: number | undefined) => {
    process.exit(code);
  });
