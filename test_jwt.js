const crypto = require('crypto');
function createToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = encode(header) + '.' + encode(payload);
  const sig = crypto.createHmac('sha256', 'super-secret-key-that-must-be-very-long-and-secure').update(unsigned).digest('base64url');
  return unsigned + '.' + sig;
}
console.log(createToken({
  sub: 'd92709db-a1de-48ec-944c-c17b5ba2cf53',
  type: 'access',
  exp: Math.floor(Date.now() / 1000) + 3600
}));
