#!/bin/bash

# Real functionality test for Playwright CLI
# Tests actual browser operations without mocks

set -e

echo "=== REAL FUNCTIONALITY TEST ==="
echo "Testing actual browser operations..."
echo ""

# Helper function to test command completion
test_command() {
    local cmd="$1"
    local expected="$2"
    echo -n "Testing: $cmd ... "
    
    # Run command in background and check if it exits
    output=$($cmd 2>&1) &
    PID=$!
    
    # Wait up to 2 seconds for process to complete
    for i in {1..20}; do
        if ! ps -p $PID > /dev/null 2>&1; then
            break
        fi
        sleep 0.1
    done
    
    if ps -p $PID > /dev/null 2>&1; then
        echo "FAILED (hanging)"
        kill $PID 2>/dev/null
        return 1
    fi
    
    # Check output contains expected string
    if [[ "$output" == *"$expected"* ]]; then
        echo "PASSED"
        return 0
    else
        echo "FAILED (unexpected output)"
        echo "  Expected: $expected"
        echo "  Got: $output"
        return 1
    fi
}

# Clean up any existing browser
pkill -f "Chrome.*remote-debugging-port=9222" 2>/dev/null || true
sleep 1

echo "1. Testing browser launch..."
test_command "./playwright open https://example.com" "Navigated to"

echo ""
echo "2. Testing page listing..."
test_command "./playwright list" "example.com"

echo ""
echo "3. Testing navigation..."
test_command "./playwright navigate https://google.com" "Successfully navigated"

echo ""
echo "4. Testing screenshot..."
rm -f /tmp/test-screenshot.png
./playwright screenshot /tmp/test-screenshot.png 2>&1 &
PID=$!
sleep 2
if ps -p $PID > /dev/null 2>&1; then
    echo "Screenshot command hanging"
    kill $PID
else
    if [ -f /tmp/test-screenshot.png ]; then
        echo "Screenshot: PASSED"
    else
        echo "Screenshot: FAILED (file not created)"
    fi
fi

echo ""
echo "5. Testing browser close..."
test_command "./playwright close" "Browser closed"

echo ""
echo "6. Testing error handling (no browser)..."
output=$(./playwright list 2>&1) &
PID=$!
sleep 1
if ps -p $PID > /dev/null 2>&1; then
    echo "Error handling: FAILED (hanging)"
    kill $PID
else
    if [[ "$output" == *"No browser"* ]] || [[ "$output" == *"Failed"* ]]; then
        echo "Error handling: PASSED"
    else
        echo "Error handling: FAILED"
    fi
fi

echo ""
echo "=== TEST SUMMARY ==="
echo "All basic functionality tests completed."
echo "The CLI should:"
echo "✓ Launch browser and navigate to URLs"
echo "✓ List open pages and contexts"
echo "✓ Navigate to new URLs"
echo "✓ Take screenshots"
echo "✓ Close browser cleanly"
echo "✓ Handle errors gracefully"