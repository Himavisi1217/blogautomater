import serverless from 'serverless-http';
import { createApp } from '../../server/app.js';

const app = createApp({ includeMutableSettings: false });

export const handler = serverless(app);
