import { Alert, Button, Spinner } from '../ui';

// Shows a loading message, an error with "Try again", or the content once data has arrived.
//   <DataState state={useAsync(...)}>{(data) => <Content data={data} />}</DataState>
export default function DataState({ state, label = 'Loading…', children }) {
  if (state.loading) {
    return (
      <div role="status" className="flex items-center gap-3 py-10 text-navy-700">
        <Spinner className="size-5" />
        <span className="font-semibold">{label}</span>
      </div>
    );
  }
  if (state.error) {
    return (
      <Alert tone="error" title="We could not load this">
        <p>{state.error.message || 'Something went wrong. Please try again.'}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={state.reload}>
          Try again
        </Button>
      </Alert>
    );
  }
  return children(state.data);
}
