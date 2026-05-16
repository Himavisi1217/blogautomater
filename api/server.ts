import { createApp } from '../server/app.js';

const app = createApp({ includeMutableSettings: false });

// Vercel serverless handler
export default (req: any, res: any) => {
  return app(req, res);
};
