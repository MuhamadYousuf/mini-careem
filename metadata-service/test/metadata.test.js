const request = require('supertest');
const app = require('../server');

// This line tricks the app into using a fake, in-memory Redis during testing!
jest.mock('ioredis', () => require('ioredis-mock'));

describe('Metadata Service API', () => {
  it('should fetch from database first, then serve from cache', async () => {
    const res1 = await request(app).get('/api/metadata');
    expect(res1.statusCode).toEqual(200);
    expect(res1.body.source).toEqual('database');

    const res2 = await request(app).get('/api/metadata');
    expect(res2.statusCode).toEqual(200);
    expect(res2.body.source).toEqual('cache');
  });

  it('should update surge multiplier and instantly update cache', async () => {
    await request(app).post('/api/metadata/surge').send({ peakFactor: 2.5 });
    const getRes = await request(app).get('/api/metadata');
    expect(getRes.body.data.peakFactor).toEqual(2.5);
  });
});