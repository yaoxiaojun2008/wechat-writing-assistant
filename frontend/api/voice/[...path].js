// Vercel API Route for Voice-related Endpoints
import formidable from 'formidable';
import fs from 'fs/promises';

export default async function handler(req, res) {
  const { path } = req.query;
  const fullPath = Array.isArray(path) ? `/${path.join('/')}` : path || '';

  if (req.url.includes('/api/voice/transcribe')) {
    if (req.method === 'POST') {
      // Parse form data to get audio file
      const form = new formidable.IncomingForm();
      
      try {
        const [fields, files] = await new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve([fields, files]);
          });
        });

        // Mock transcription - in real implementation, this would call a speech recognition API
        // For Vercel, we could use @vercel/kv for temporary storage or external APIs
        
        // For now, return mock transcription
        return res.status(200).json({
          success: true,
          data: {
            text: 'This is a mock transcription of the audio file. In a real implementation, this would connect to a speech recognition service.',
            duration: 5.2, // seconds
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Transcription error:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Transcription failed', details: error.message }
        });
      }
    }
  }

  if (req.url.includes('/api/voice/upload')) {
    if (req.method === 'POST') {
      try {
        const form = new formidable.IncomingForm();
        const [fields, files] = await new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve([fields, files]);
          });
        });

        // Process uploaded file (in real implementation)
        // Store in Vercel Blob or external storage
        
        return res.status(200).json({
          success: true,
          data: {
            message: 'Audio file uploaded successfully',
            fileName: files.audio?.originalFilename || 'unknown',
            size: files.audio?.size || 0,
            uploadId: 'upload_' + Date.now()
          }
        });
      } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Upload failed', details: error.message }
        });
      }
    }
  }

  // For other voice-related endpoints, we might need to proxy to backend
  // But for Vercel compatibility, it's better to implement directly
  
  return res.status(404).json({ error: 'Voice endpoint not found' });
}

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing for file uploads
  },
};