// Generic API Route Handler for Vercel
// This handles any API routes that aren't specifically handled by other route files

export default function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? `/${path.join('/')}` : path || '';
  
  // If we reach this handler, it means no specific route matched
  // Return a 404 error
  return res.status(404).json({ 
    success: false, 
    error: `API endpoint not found: ${req.method} ${req.url}` 
  });
}

export const config = {
  api: {
    bodyParser: true,
  },
};