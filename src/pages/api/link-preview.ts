import { NextApiRequest, NextApiResponse } from 'next';
import { getLinkPreview } from 'link-preview-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const data = await getLinkPreview(url);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch link preview' });
  }
}