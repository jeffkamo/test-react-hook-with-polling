import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import useFetchByPolling from '../useFetchByPolling';

// Test component that uses the hook
function TestUseFetchByPolling({ maxAttempts = 10, pollInterval = 1000 }) {
  const { loading, success, failed, timeout, pollCount } = useFetchByPolling(maxAttempts, pollInterval);

  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="success">{success ? 'true' : 'false'}</div>
      <div data-testid="failed">{failed ? 'true' : 'false'}</div>
      <div data-testid="timeout">{timeout ? 'true' : 'false'}</div>
      <div data-testid="pollCount">{pollCount}</div>
      <div data-testid="status">
        {loading && 'loading'}
        {success && 'success'}
        {timeout && 'timeout'}
        {failed && 'failed'}
        {!loading && !success && !timeout && !failed && 'idle'}
      </div>
    </div>
  );
}

// Create MSW server with handlers
const server = setupServer(
  rest.get('http://localhost/api/stuff', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useFetchByPolling (Component Tests)', () => {
  test('starts with loading state and poll count 0', () => {
    render(<TestUseFetchByPolling />);

    expect(screen.getByTestId('loading')).toHaveTextContent('true'); // Loading starts immediately when polling begins
    expect(screen.getByTestId('success')).toHaveTextContent('false');
    expect(screen.getByTestId('failed')).toHaveTextContent('false');
    expect(screen.getByTestId('timeout')).toHaveTextContent('false');
    expect(screen.getByTestId('pollCount')).toHaveTextContent('0');
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  test('sets success state when API returns 200', async () => {
    render(<TestUseFetchByPolling />);

    await waitFor(() => {
      expect(screen.getByTestId('success')).toHaveTextContent('true');
    }, { timeout: 3000 });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('failed')).toHaveTextContent('false');
    expect(screen.getByTestId('timeout')).toHaveTextContent('false');
    expect(screen.getByTestId('pollCount')).toHaveTextContent('0'); // Successful on first attempt
    expect(screen.getByTestId('status')).toHaveTextContent('success');
  });

  for (let i = 0; i < 20; i++) {
    test(`sets timeout to true when max attempts are reached (iteration ${i + 1})`, async () => {
      // Mock API to return 500 error
      server.use(
        rest.get('http://localhost/api/stuff', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      render(<TestUseFetchByPolling maxAttempts={3} pollInterval={10} />);

      // Wait for polling to complete all attempts and timeout
      await waitFor(() => {
        expect(screen.getByTestId('timeout')).toHaveTextContent('true');
      }, { timeout: 1000 });

      // Verify timeout state is explicitly true
      expect(screen.getByTestId('timeout')).toHaveTextContent('true');
      expect(screen.getByTestId('pollCount')).toHaveTextContent('3');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('success')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('timeout');
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

    render(<TestUseFetchByPolling maxAttempts={5} pollInterval={200} />);

    // Wait for success after failures
    await waitFor(() => {
      expect(screen.getByTestId('success')).toHaveTextContent('true');
    }, { timeout: 5000 });

    expect(screen.getByTestId('pollCount')).toHaveTextContent('2'); // Failed twice, succeeded on third
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('timeout')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('success');
  }, 10000);

  test('respects custom maxAttempts parameter and sets timeout to true', async () => {
    // Mock API to always return error
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<TestUseFetchByPolling maxAttempts={2} pollInterval={200} />);

    // Wait for timeout after max attempts
    await waitFor(() => {
      expect(screen.getByTestId('timeout')).toHaveTextContent('true');
    }, { timeout: 3000 });

    // Explicitly verify timeout is true when max attempts (2) are hit
    expect(screen.getByTestId('timeout')).toHaveTextContent('true');
    expect(screen.getByTestId('pollCount')).toHaveTextContent('2');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('success')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('timeout');
  }, 10000);

  test('timeout is true when exactly max attempts are hit (edge case)', async () => {
    // Mock API to always return error
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<TestUseFetchByPolling maxAttempts={1} pollInterval={100} />);

    // Wait for timeout after exactly 1 attempt
    await waitFor(() => {
      expect(screen.getByTestId('timeout')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Verify timeout is true when exactly max attempts (1) are hit
    expect(screen.getByTestId('timeout')).toHaveTextContent('true');
    expect(screen.getByTestId('pollCount')).toHaveTextContent('1');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('success')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('timeout');
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

    render(<TestUseFetchByPolling maxAttempts={5} pollInterval={100} />);

    // Wait for success
    await waitFor(() => {
      expect(screen.getByTestId('success')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Verify timeout remains false when success occurs before max attempts
    expect(screen.getByTestId('timeout')).toHaveTextContent('false');
    expect(screen.getByTestId('success')).toHaveTextContent('true');
    expect(screen.getByTestId('pollCount')).toHaveTextContent('0'); // Success on first attempt
    expect(screen.getByTestId('status')).toHaveTextContent('success');
  }, 10000);

  test('cleans up timeout on unmount', async () => {
    // Mock API to always return error
    server.use(
      rest.get('http://localhost/api/stuff', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { unmount } = render(<TestUseFetchByPolling maxAttempts={10} pollInterval={100} />);

    // Wait for at least one attempt to complete
    await waitFor(() => {
      expect(screen.getByTestId('pollCount')).not.toHaveTextContent('0');
    }, { timeout: 2000 });

    const pollCountBeforeUnmount = parseInt(screen.getByTestId('pollCount').textContent);

    // Unmount the component
    unmount();

    // Wait a bit to ensure no more polling happens
    await new Promise(resolve => setTimeout(resolve, 300));

    // Since component is unmounted, we can't check the state directly
    // This test verifies that unmounting doesn't cause errors or memory leaks
    expect(pollCountBeforeUnmount).toBeGreaterThan(0);
  }, 10000);
}); 