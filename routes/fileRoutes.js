import express from 'express';
import { upload } from '../config/multerConfig.js';
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

// Get approved notices
router.get('/notices', getNotices);

// Get pending notices (for admin approval)
router.get('/notices/pending', getPendingNotices);

// File upload route
router.post('/upload', upload.single('file'), uploadFile);

// Delete notice (soft delete)
router.delete('/notices/:id', deleteNotice);

// Serve file for viewing
router.get('/file/:id', serveFile);

// Approve or reject notice
router.put('/notices/approve/:id', approveNotice);

export default router