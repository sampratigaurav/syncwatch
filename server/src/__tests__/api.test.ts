import request from 'supertest';
import express from 'express';

const app = express();
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('Health Check API', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
