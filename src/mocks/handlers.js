import { rest } from 'msw';

export const handlers = [
  // Mock handler for /api/stuff endpoint
  rest.get('http://localhost/api/stuff', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}));
  }),
]; 