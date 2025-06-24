# React Hook with Polling

A React project that implements a custom hook for polling API endpoints with configurable retry logic and timeout handling. The project includes comprehensive tests that validate the polling function's behavior in different scenarios:

- **Hook-only testing** - Tests that exercise the hook directly using `renderHook`
- **Component integration testing** - Tests that validate the hook's behavior when used within a React component
- **State validation** - Tests that verify loading, success, failure, and timeout states work correctly
- **Polling behavior verification** - Tests that ensure the polling stops appropriately on success or timeout
- **Edge case coverage** - Tests for scenarios like exact max attempts, cleanup on unmount, and retry logic

## Purpose

This project was created to investigate (and MAYBE reproduce) a specific bug related to polling behavior in the `useFetchByPolling` hook. The bug in question involves a suspected memory leak that would cause test iterations to progressively slow down when testing a React hook that performs continuous polling. However, this repository demonstrates that such a memory leak does not actually occur.

When running the tests, we _expect_ to see the tests run such that the polling does not negatively effect the performance of the tests. For example, running the `useFetchByPolling.component.test.js` test should yield a result like the following:

```bash
➜  test-react-hook-with-polling git:(master) ✗ npm test src/hooks/__tests__/useFetchByPolling.component.test.js

> test-hook@1.0.0 test
> jest src/hooks/__tests__/useFetchByPolling.component.test.js

 PASS  src/hooks/__tests__/useFetchByPolling.component.test.js (6.046 s)
  useFetchByPolling (Component Tests)
    ✓ starts with loading state and poll count 0 (42 ms)
    ✓ sets success state when API returns 200 (19 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 1) (212 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 2) (217 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 3) (227 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 4) (217 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 5) (220 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 6) (224 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 7) (213 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 8) (226 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 9) (227 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 10) (218 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 11) (229 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 12) (219 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 13) (235 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 14) (222 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 15) (220 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 16) (227 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 17) (224 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 18) (228 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 19) (285 ms)
    ✓ sets timeout to true when max attempts are reached (iteration 20) (213 ms)
    ✓ stops polling when API succeeds after failures (422 ms)
    ✓ respects custom maxAttempts parameter and sets timeout to true (213 ms)
    ✓ timeout is true when exactly max attempts are hit (edge case) (5 ms)
    ✓ timeout remains false when success occurs before max attempts (5 ms)
    ✓ cleans up timeout on unmount (310 ms)
```

Notice the following:

- The "sets timeout to true when max attempts are reached" test runs many times (20 iterations)
- Each iteration takes about the same amount of time (~200-285ms)
- There are other tests that are running as well

These observations are crucial for validating that the polling bug has been fixed:

**Why we repeat the same test:** The bug manifests when polling tests run repeatedly - each iteration should complete in roughly the same time. If the bug exists, you'd see increasing execution times as memory leaks or resource accumulation occur with each test run.

**Why consistent timing matters:** Each iteration should take approximately the same duration (~200-285ms) regardless of how many times it's been run. This proves that the polling mechanism properly cleans up resources between tests and doesn't suffer from performance degradation.

**Why we run other tests alongside:** The solution must work holistically - it shouldn't break other test scenarios. Running various tests together validates that the fix doesn't introduce regressions in success cases, edge cases, or cleanup scenarios.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
``` 
