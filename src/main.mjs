import { findUp } from 'find-up'
import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { create } from 'xmlbuilder'

const { TEST_TIMESTAMP } = process.env

/**
 * @typedef { import("stream").Readable } Readable
 * @typedef { import("stream").Writable } Writable
 */

/**
 * @param {Readable} input
 * @param {Writable} output
 */
async function main(input, output) {
  if (process.stdin.isTTY) {
    throw new Error('expected input to be piped in')
  }

  const name = await getPackageName()

  const parser = newParser()

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
  })

  let errorLines = []

  for await (const line of rl) {
    if (errorLines.length === 1) {
      parser.parse([...errorLines, line])
      errorLines = []
    } else {
      errorLines.push(line)
    }
  }

  const xml = toJunit(name, parser.errors)
  output.write(xml + '\n')

  return parser.errors.length ? 1 : 0
}

/**
 * @returns {string}
 */
async function getPackageName() {
  try {
    const pkgPath = await findUp('package.json')
    const pkgStr = await fs.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(pkgStr)
    return pkg.name
  } catch {
    return 'Unknown Package'
  }
}

/**
 * @typedef {object} Parser
 * @property {CompilerError[]} errors
 * @property {(lines: string[]) => void} parse
 *
 * @typedef {object} CompilerError
 * @property {string} filename
 * @property {number} line
 * @property {number} col
 * @property {string} code
 * @property {string} message
 * @property {string} specificMessage
 * @property {string} [source]
 */

// We only handle the format without --pretty right now
const UGLY_REGEX = /^(?<file>.+?)\((?<line>\d+),(?<col>\d+)\): error (?<code>\S+?): (?<message>.+)$/

/**
 * @returns {Parser}
 */
function newParser() {
  const errors = []
  function parse([line1, line2]) {
    const match = UGLY_REGEX.exec(line1)

    if (match) {
      errors.push({
        filename: path.resolve(match.groups.file),
        line: Number(match.groups.line),
        col: Number(match.groups.col),
        code: match.groups.code,
        message: match.groups.message,
        specificMessage: line2,
        source: [line1, line2],
      })
    }
  }

  return { errors, parse }
}

function getFailureText({ filename, line, col, code, message, specificMessage }) {
  return `error ${code}: ${message}
${specificMessage}
    at (${filename}:${line}:${col})`
}

/**
 * @param {string} name
 * @param {CompilerError[]} errors
 * @returns {string}
 */
function toJunit(name, errors) {
  const timestamp = TEST_TIMESTAMP ? parseInt(TEST_TIMESTAMP, 10) : Date.now()

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
                '#text': getFailureText(err),
              },
            }))
          : {
              '@name': 'no errors reported',
              '@classname': 'no errors reported',
            },
      },
    },
  }

  return create(obj).end({ pretty: true, allowEmpty: true })
}

main(process.stdin, process.stdout)
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('ERROR: ' + err.message)
    return 1
  })
  .then((code) => {
    process.exit(code)
  })
