import useFetchByPolling from '../hooks/useFetchByPolling';

export default function TestComponent() {
  const { loading, success, failed, timeout, pollCount } = useFetchByPolling();

  if (loading) {
    return <div>loading</div>;
  }

  if (success) {
    return <div>success!</div>;
  }

  if (timeout) {
    return <div>timeout after {pollCount} attempts</div>;
  }

  if (failed) {
    return <div>failed (error occurred)</div>;
  }

  return <div>idle</div>;
} 