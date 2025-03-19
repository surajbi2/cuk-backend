import express from 'express';
import upload from '../config/multerConfig.js';
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

// File upload route
router.post('/upload', upload.single('file'), uploadFile);

// Get approved notices
router.get('/notices', getNotices);

// Get pending notices (for admin approval)
router.get('/notices/pending', getPendingNotices);

// Delete notice (soft delete)
router.delete('/notices/:id', deleteNotice);

// Serve file for viewing/download
router.get('/file/:id', serveFile);

// Explicit download route
router.get('/notices/download/:id', downloadFile);

// Approve or reject notice
router.put('/notices/approve/:id', approveNotice);

export default router;