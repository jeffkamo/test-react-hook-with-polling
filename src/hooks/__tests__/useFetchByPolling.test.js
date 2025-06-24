import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import useFetchByPolling from '../useFetchByPolling';

// Create MSW server with handlers
const server = setupServer(
  rest.get('http://localhost/api/stuff', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useFetchByPolling', () => {
  test('starts with loading state and poll count 0', () => {
    const { result } = renderHook(() => useFetchByPolling());
    
    expect(result.current.loading).toBe(true); // Loading starts immediately when polling begins
    expect(result.current.success).toBe(false);
    expect(result.current.failed).toBe(false);
    expect(result.current.timeout).toBe(false);
    expect(result.current.pollCount).toBe(0);
  });

  test('sets success state when API returns 200', async () => {
    const { result } = renderHook(() => useFetchByPolling());

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.loading).toBe(false);
    expect(result.current.failed).toBe(false);
    expect(result.current.timeout).toBe(false);
    expect(result.current.pollCount).toBe(0); // Successful on first attempt
  });

  for (let i = 0; i < 20; i++) {
    test('sets timeout to true when max attempts are reached', async () => {
        // Mock API to return 500 error
        server.use(
          rest.get('http://localhost/api/stuff', (req, res, ctx) => {
              return res(ctx.status(500));
          })
        );

        const { result } = renderHook(() => useFetchByPolling(3, 100));

        // Wait for polling to complete all attempts and timeout
        await waitFor(() => {
        expect(result.current.timeout).toBe(true);
        }, { timeout: 5000 });

        // Verify timeout state is explicitly true
        expect(result.current.timeout).toBe(true);
        expect(result.current.pollCount).toBe(3);
        expect(result.current.loading).toBe(false);
        expect(result.current.success).toBe(false);
    }, 10000);
    }

  test('stops polling when API succeeds after failures', async () => {
    let callCount = 0;

    // Mock API to fail first 2 times, then succeed
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        callCount++;
        if (callCount <= 2) {
          return res(ctx.status(500));
        }
        return res(ctx.status(200), ctx.json({}));
      })
    );

    const { result } = renderHook(() => useFetchByPolling(5, 200));

    // Wait for success after failures
    await waitFor(() => {
      expect(result.current.success).toBe(true);
    }, { timeout: 5000 });

    expect(result.current.pollCount).toBe(2); // Failed twice, succeeded on third
    expect(result.current.loading).toBe(false);
    expect(result.current.timeout).toBe(false);
  }, 10000);

  test('respects custom maxAttempts parameter and sets timeout to true', async () => {
    // Mock API to always return error
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { result } = renderHook(() => useFetchByPolling(2, 200));

    // Wait for timeout after max attempts
    await waitFor(() => {
      expect(result.current.timeout).toBe(true);
    }, { timeout: 3000 });

    // Explicitly verify timeout is true when max attempts (2) are hit
    expect(result.current.timeout).toBe(true);
    expect(result.current.pollCount).toBe(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
  }, 10000);

  test('timeout is true when exactly max attempts are hit (edge case)', async () => {
    // Mock API to always return error
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { result } = renderHook(() => useFetchByPolling(1, 100));

    // Wait for timeout after exactly 1 attempt
    await waitFor(() => {
      expect(result.current.timeout).toBe(true);
    }, { timeout: 2000 });

    // Verify timeout is true when exactly max attempts (1) are hit
    expect(result.current.timeout).toBe(true);
    expect(result.current.pollCount).toBe(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
  }, 10000);

  test('timeout remains false when success occurs before max attempts', async () => {
    let callCount = 0;

    // Mock API to succeed on first call
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        callCount++;
        return res(ctx.status(200), ctx.json({}));
      })
    );

    const { result } = renderHook(() => useFetchByPolling(5, 100));

    // Wait for success
    await waitFor(() => {
      expect(result.current.success).toBe(true);
    }, { timeout: 2000 });

    // Verify timeout remains false when success occurs before max attempts
    expect(result.current.timeout).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.pollCount).toBe(0); // Success on first attempt
  }, 10000);

  test('cleans up timeout on unmount', async () => {
    // Mock API to always return error
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { result, unmount } = renderHook(() => useFetchByPolling(10, 100));

    // Wait for at least one attempt to complete
    await waitFor(() => {
      expect(result.current.pollCount).toBeGreaterThan(0);
    }, { timeout: 2000 });

    const pollCountBeforeUnmount = result.current.pollCount;

    // Unmount the hook
    unmount();

    // Wait a bit to ensure no more polling happens
    await new Promise(resolve => setTimeout(resolve, 300));

    // Poll count should not have increased significantly after unmount
    expect(result.current.pollCount).toBeLessThanOrEqual(pollCountBeforeUnmount + 1);
  }, 10000);
}); 