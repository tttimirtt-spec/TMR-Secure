import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.mjs';

const env = {
    SITE_ORIGIN: 'https://tttimirtt-spec.github.io',
    TABRICA_AUTHORIZATION: 'Bearer test-token',
    TABRICA_DATABASE_ID: '352',
    TABRICA_STATS_TABLE_ID: '515',
    TABRICA_REVIEWS_TABLE_ID: '518',
    TABRICA_DOWNLOADS_FIELD_ID: '4790'
};

function request(path, { method = 'GET', origin = env.SITE_ORIGIN, body } = {}) {
    return new Request(`https://api.example${path}`, {
        method,
        headers: {
            Origin: origin,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
}

test('rejects requests from origins other than the website', async () => {
    let upstreamCalled = false;
    globalThis.fetch = async () => {
        upstreamCalled = true;
        throw new Error('unexpected upstream request');
    };

    const response = await worker.fetch(request('/stats', { origin: 'https://attacker.example' }), env);
    assert.equal(response.status, 403);
    assert.equal(upstreamCalled, false);
});

test('proxies stats with the authorization secret kept server-side', async () => {
    globalThis.fetch = async (_url, options) => {
        assert.equal(options.headers.Authorization, env.TABRICA_AUTHORIZATION);
        return Response.json({ data: { records: [{ '4790': 12 }] } });
    };

    const response = await worker.fetch(request('/stats'), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
    assert.deepEqual(await response.json(), { data: { records: [{ '4790': 12 }] } });
});

test('validates reviews and writes them using the detected Tabrica fields', async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        if (options.method === 'POST') return Response.json({ data: { id: 'new-review' } });
        return Response.json({
            data: {
                records: [{ id: '1', created: '', updated: '', '120': '', '121': '', '122': '', '123': '' }]
            }
        });
    };

    const invalid = await worker.fetch(request('/reviews', {
        method: 'POST',
        body: { name: '', text: 'review', rating: 5 }
    }), env);
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).details, /имя/i);
    assert.equal(calls.length, 0);

    const response = await worker.fetch(request('/reviews', {
        method: 'POST',
        body: { name: 'Test', text: 'Great app', rating: 5 }
    }), env);
    assert.equal(response.status, 201);
    assert.equal(calls.length, 2);
    assert.deepEqual(JSON.parse(calls[1].options.body).data, {
        '120': 'Test',
        '121': 'Great app',
        '122': 5,
        '123': new Date().toLocaleDateString('de-DE', { timeZone: 'UTC' })
    });
});

test('reports missing Tabrica credentials without contacting the upstream API', async () => {
    let upstreamCalled = false;
    globalThis.fetch = async () => {
        upstreamCalled = true;
        throw new Error('unexpected upstream request');
    };

    const response = await worker.fetch(request('/reviews', { method: 'GET' }), {
        ...env,
        TABRICA_AUTHORIZATION: ''
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Tabrica API is not configured' });
    assert.equal(upstreamCalled, false);
});

test('increments the download count on the server', async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return options.method === 'PATCH'
            ? Response.json({ data: { updated: true } })
            : Response.json({ data: { records: [{ id: 'counter', '4790': 12 }] } });
    };

    const response = await worker.fetch(request('/downloads', { method: 'POST' }), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { downloads: 13 });
    assert.deepEqual(JSON.parse(calls[1].options.body), { data: { '4790': 13 } });
});
