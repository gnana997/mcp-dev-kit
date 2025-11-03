import { bench, describe } from 'vitest';
import { expect } from 'vitest';

// Test what returns from expect().toMatchSnapshot()
describe('Debug: What does toMatchSnapshot return?', () => {
  bench('test return value', () => {
    const data = { test: 'data' };
    const result = expect(data).toMatchSnapshot();
    console.log('Result:', result);
    console.log('Type:', typeof result);
    return result;
  });
});
