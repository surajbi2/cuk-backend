import express from 'express';
import {
    uploadFile,
    getNotices,
    getPendingNotices,
    deleteNotice,
    serveFile,
    approveNotice,
    downloadFile,
    upload
} from '../controllers/fileController.js';

const router = express.Router();

// Explicit download route - needs to be before other /notices routes
router.get('/notices/download/:id', downloadFile);

// File upload route
router.post('/upload', upload.single('file'), uploadFile);

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
router.use((err, req, res, next) => {
    console.error('Route error:', err);
    res.status(500).json({ 
        message: 'Server error while processing upload',
        error: err.message
    });
});

export default router;