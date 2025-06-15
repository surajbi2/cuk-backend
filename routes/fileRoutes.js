import express from 'express';
import { upload, multerErrorHandler } from '../config/multerConfig.js';
import {
    uploadFile,
    getNotices,
    getPendingNotices,
    deleteNotice,
    serveFile,
    approveNotice,
    downloadFile
} from '../controllers/fileController.js';

const router = express.Router();

// Explicit download route - needs to be before other /notices routes
router.get('/notices/download/:id', downloadFile);

// File upload route with error handling
router.post('/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(500).json({ 
                message: 'Upload failed', 
                error: err.message,
                path: err.path
            });
        }
        next();
    });
}, uploadFile);

// Get approved notices
router.get('/notices', getNotices);

// Get pending notices (for admin approval)
router.get('/notices/pending', getPendingNotices);

// Delete notice (soft delete)
router.delete('/notices/:id', deleteNotice);

// Serve file for viewing
router.get('/file/:id', serveFile);

// Approve or reject notice
router.put('/notices/approve/:id', approveNotice);

// Error handling middleware
router.use(multerErrorHandler);

export default router;