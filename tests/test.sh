#!/bin/sh

SCRIPT_PATH='../src/main.ts'

cd tests

find_error_path=$(pwd)

export TEST_TIMESTAMP='1681844115457'

cat error.txt | npx tsx "$SCRIPT_PATH" >actual.txt

error=$?

sed "s#TESTS_PATH#$find_error_path#g" expected.txt >expected-paths-replaced.txt

git diff --exit-code --no-index expected-paths-replaced.txt actual.txt
error_diff=$?

if [ "$error" != "1" ]; then
  echo "Unexpected exit code $result. Expected 1"
  exit 1
fi

if [ "$error_diff" != "0" ]; then
  echo "Unexpected output diff"
  exit 1
fi

cat no-error.txt | npx tsx "$SCRIPT_PATH" >actual-no-error.txt

no_error=$?

git diff --exit-code --no-index expected-no-error.txt actual-no-error.txt
no_error_diff=$?

if [ "$no_error" != "0" ]; then
  echo "Unexpected exit code $result. Expected 0"
  exit 1
fi

if [ "$no_error_diff" != "0" ]; then
  echo "Unexpected output diff"
  exit 1
fi
