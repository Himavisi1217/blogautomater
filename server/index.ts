import { createApp } from './app.js';

const app = createApp({ includeMutableSettings: true });
const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Blog Automation Server running on http://localhost:${PORT}`);
});
