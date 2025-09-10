const express = require('express');

const app = express();
const port = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

app.listen(port, () => {
  console.log(`🚀 Test server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});