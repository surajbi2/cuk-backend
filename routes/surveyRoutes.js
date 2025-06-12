import express from 'express';
import { upload } from '../config/multerConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { uploadSurvey, getAllSurveys, downloadSurvey, serveSurveyFile } from '../controllers/surveyController.js';

const router = express.Router();

// Debug middleware for survey routes
router.use((req, res, next) => {
    console.log(`[Survey Route] ${req.method} ${req.path}`);
    next();
});

// Get all surveys
router.get('/', getAllSurveys);

// Upload new survey (admin only)
router.post('/upload', 
    (req, res, next) => {
        console.log('Upload request received:', {
            body: req.body,
            files: req.files,
            headers: req.headers
        });
        next();
    },
    authenticateToken,
    upload.single('file'),
    uploadSurvey
);

// Serve file for viewing
router.get('/file/:id', serveSurveyFile);

// Download survey
router.get('/download/:id', downloadSurvey);

export default router;