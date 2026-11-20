const { createHash, randomUUID } = require('node:crypto');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers.origin;
  if (!origin || (origin !== 'https://santos-selfie.vercel.app' && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) return res.status(500).json({ error: 'Cloudinary is not configured' });

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'santos-selfie';
  const publicId = randomUUID();
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${secret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ cloudName, apiKey, timestamp, folder, publicId, signature });
};
