# typescript-jest-junit-reporter

Produce Jest JUnit-style XML output from TypeScript compiler messages.

Based on https://github.com/glenjamin/typescript-xunit-xml.


## Installation

```sh
npm install --save-dev @takeshape/typescript-jest-junit-reporter
```

## Usage

```sh
tsc | typescript-jest-junit-reporter | tee junit.xml
```
