import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ErrorPage from '../src/routes/+error.svelte';

describe('+error.svelte', () => {
  it('shows status and message', () => {
    const { getByText } = render(ErrorPage, { props: { status: 500, error: new Error('boom') } });
    expect(getByText('500')).toBeTruthy();
    expect(getByText('boom')).toBeTruthy();
  });
});
