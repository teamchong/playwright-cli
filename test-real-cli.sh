#!/bin/bash

# Test script for real CLI functionality
set -e

echo "=== Building CLI ==="
pnpm build

echo -e "\n=== Test 1: Open browser with URL ==="
./playwright open https://example.com
sleep 2

echo -e "\n=== Test 2: List pages ==="
./playwright list

echo -e "\n=== Test 3: Navigate to another URL ==="
./playwright navigate https://google.com
sleep 2

echo -e "\n=== Test 4: Take screenshot ==="
./playwright screenshot /tmp/test-screenshot.png
ls -la /tmp/test-screenshot.png

echo -e "\n=== Test 5: Click element (will fail if no link) ==="
./playwright click "a" || echo "Expected: No link to click on google.com"

echo -e "\n=== Test 6: Close browser ==="
./playwright close

echo -e "\n=== All tests completed ==="