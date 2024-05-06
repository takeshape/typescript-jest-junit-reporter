#!/bin/sh

SCRIPT_PATH='../src/main.js'

cd tests

export TEST_TIMESTAMP='1681844115457'

cat error.txt | node "$SCRIPT_PATH" >actual.txt

error=$?

git diff --exit-code --no-index expected.txt actual.txt
error_diff=$?

if [ "$error" != "1" ]; then
  echo "Unexpected exit code $result. Expected 1"
  exit 1
fi

if [ "$error_diff" != "0" ]; then
  echo "Unexpected output diff"
  exit 1
fi

cat no-error.txt | node ../src/main.js >actual-no-error.txt

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
