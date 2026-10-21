const serverless = require('serverless-http');
const app = require('../../server/server');

const run = serverless(app);

exports.handler = async (event, context) => {
    // Make sure the path always looks like /api/...
    let p = event.path || '/';
    p = p.replace(/^\/\.netlify\/functions\/api/, '');
    if (!p.startsWith('/api')) p = `/api${p}`;
    event.path = p;
    return run(event, context);
};