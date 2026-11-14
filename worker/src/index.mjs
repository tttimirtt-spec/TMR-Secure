const json = (body, status, origin) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Vary': 'Origin'
        }
    });

function recordsFrom(result) {
    return result?.data?.records ?? [];
}

function authorizationHeaders(env) {
    if (!env.TABRICA_AUTHORIZATION) {
        throw new Error('TABRICA_AUTHORIZATION is not configured');
    }

    return {
        Authorization: env.TABRICA_AUTHORIZATION,
        'Content-Type': 'application/json'
    };
}

function tableUrl(env, tableId) {
    return `https://api.tabrica.ru/public/v1/databases/${env.TABRICA_DATABASE_ID}/tables/${tableId}/records`;
}

async function getReviewFieldIds(env) {
    const response = await fetch(tableUrl(env, env.TABRICA_REVIEWS_TABLE_ID), {
        headers: authorizationHeaders(env)
    });
    if (!response.ok) throw new Error(`Tabrica returned ${response.status}`);

    const records = recordsFrom(await response.json());
    if (records.length) {
        const ids = Object.keys(records[0])
            .filter(key => !['id', 'created', 'updated'].includes(key))
            .sort((a, b) => Number(a) - Number(b));
        if (ids.length >= 4) {
            return { name: ids[0], text: ids[1], rating: ids[2], date: ids[3] };
        }
    }
    return { name: 'name', text: 'text', rating: 'rating', date: 'date' };
}

async function handle(request, env) {
    const origin = request.headers.get('Origin');
    if (origin !== env.SITE_ORIGIN) {
        return json({ error: 'Origin not allowed' }, 403, env.SITE_ORIGIN);
    }

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': env.SITE_ORIGIN,
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
                'Vary': 'Origin'
            }
        });
    }

    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/stats') {
        const upstream = await fetch(tableUrl(env, env.TABRICA_STATS_TABLE_ID), {
            headers: authorizationHeaders(env)
        });
        if (!upstream.ok) throw new Error(`Tabrica returned ${upstream.status}`);
        return json(await upstream.json(), 200, env.SITE_ORIGIN);
    }

    if (request.method === 'POST' && path === '/downloads') {
        const headers = authorizationHeaders(env);
        const url = tableUrl(env, env.TABRICA_STATS_TABLE_ID);
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`Tabrica returned ${response.status}`);
        const records = recordsFrom(await response.json());
        const record = records[0];
        if (!record?.id) return json({ error: 'Download counter is not configured' }, 503, env.SITE_ORIGIN);

        const fieldId = env.TABRICA_DOWNLOADS_FIELD_ID || '4790';
        const current = Number(record[fieldId] ?? record.downloads ?? 0);
        const downloads = (Number.isFinite(current) ? current : 0) + 1;
        const update = await fetch(`${url}/${encodeURIComponent(record.id)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ data: { [fieldId]: downloads } })
        });
        if (!update.ok) throw new Error(`Tabrica returned ${update.status}`);
        return json({ downloads }, 200, env.SITE_ORIGIN);
    }

    if (request.method === 'GET' && path === '/reviews') {
        const upstream = await fetch(tableUrl(env, env.TABRICA_REVIEWS_TABLE_ID), {
            headers: authorizationHeaders(env)
        });
        if (!upstream.ok) throw new Error(`Tabrica returned ${upstream.status}`);
        return json(await upstream.json(), 200, env.SITE_ORIGIN);
    }

    if (request.method === 'POST' && path === '/reviews') {
        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Invalid JSON body' }, 400, env.SITE_ORIGIN);
        }

        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        const rating = Number(body.rating);
        if (!name || name.length > 60 || text.length < 3 || text.length > 1200 ||
            !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return json({ error: 'Invalid review' }, 400, env.SITE_ORIGIN);
        }

        const fields = await getReviewFieldIds(env);
        const date = new Date().toLocaleDateString('de-DE', { timeZone: 'UTC' });
        const upstream = await fetch(tableUrl(env, env.TABRICA_REVIEWS_TABLE_ID), {
            method: 'POST',
            headers: authorizationHeaders(env),
            body: JSON.stringify({
                data: {
                    [fields.name]: name,
                    [fields.text]: text,
                    [fields.rating]: rating,
                    [fields.date]: date
                }
            })
        });
        if (!upstream.ok) throw new Error(`Tabrica returned ${upstream.status}`);
        return json(await upstream.json(), 201, env.SITE_ORIGIN);
    }

    return json({ error: 'Not found' }, 404, env.SITE_ORIGIN);
}

export default {
    async fetch(request, env) {
        const origin = env.SITE_ORIGIN || '*';
        try {
            return await handle(request, env);
        } catch (error) {
            console.error('API request failed:', error.message);
            return json({ error: 'API request failed' }, 502, origin);
        }
    }
};
