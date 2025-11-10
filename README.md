# typescript-jest-junit-reporter

Produce Jest JUnit-style XML output from TypeScript compiler messages.

Based on https://github.com/glenjamin/typescript-xunit-xml.


## Installation

```sh
npm install --save-dev @takeshape/typescript-jest-junit-reporter
```

## Usage

### Basic shell usage

```sh
tsc | typescript-jest-junit-reporter | tee junit.xml
```

### GitHub Actions - a package.json script in a monorepo

```json
{
  "typecheck": "tsc --noEmit --pretty false | typescript-jest-junit-reporter | tee \"${GITHUB_WORKSPACE}/typecheck-results/${npm_package_name#*\\/}/typescript-results.xml\""
}
```
