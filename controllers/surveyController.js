// Survey controller implementation
import db from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getUploadDirectory } from '../config/multerConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadSurvey = async (req, res) => {
    try {
        console.log('Upload survey request headers:', req.headers);
        const { title, year } = req.body;
        const file = req.file;
        
        console.log('Survey upload request:', {
            title,
            year,
            file: file ? {
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            } : 'No file',
            user: req.user
        });

        // Check if user is admin
        if (req.user.role !== 'admin') {
            console.log('Access denied: User is not admin');
            return res.status(403).json({ message: 'Admin access required' });
        }

        if (!file) {
            console.error('No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!title || !year) {
            console.error('Missing required fields:', { title, year });
            return res.status(400).json({ message: 'Title and year are required' });
        }

        // Use the upload directory from multer config
        const uploadDir = getUploadDirectory();
        const relativePath = path.join('uploads', file.filename);
        const absolutePath = path.join(uploadDir, file.filename);

        console.log('File paths:', {
            uploadDir,
            relativePath,
            absolutePath,
            exists: fs.existsSync(absolutePath)
        });

        // Verify file was created
        if (!fs.existsSync(absolutePath)) {
            console.error('File not saved correctly at:', absolutePath);
            return res.status(500).json({ 
                message: 'Failed to save file',
                details: {
                    path: absolutePath,
                    uploadDir,
                    relativePath
                }
            });
        }

        // Insert survey record into database
        const [result] = await db.query(
            'INSERT INTO surveys (title, year, file_path, upload_date, file_mimetype, status) VALUES (?, ?, ?, NOW(), ?, 1)',
            [title, year, relativePath, file.mimetype]
        );

        console.log('Database insert result:', result);

        res.status(201).json({ 
            message: 'Survey uploaded successfully',
            id: result.insertId,
            details: {
                title,
                year,
                filename: file.originalname
            }
        });

    } catch (error) {
        console.error('Error uploading survey:', error);
        res.status(500).json({ 
            message: 'Error uploading survey',
            error: error.message
        });
    }
};

export const getAllSurveys = async (req, res) => {
    try {
        console.log('Fetching all surveys');
        const [surveys] = await db.query(
            'SELECT id, title, year, file_path, file_mimetype, upload_date FROM surveys WHERE status = 1 ORDER BY year DESC'
        );
        console.log('Found surveys:', surveys);

        const formattedSurveys = surveys.map(survey => ({
            id: survey.id,
            type: 'SSS',
            year: survey.year,
            description: survey.title,
            link: `/api/surveys/file/${survey.id}`,
            downloadLink: `/api/surveys/download/${survey.id}`,
            uploadDate: survey.upload_date
        }));

        console.log('Formatted surveys:', formattedSurveys);
        res.json(formattedSurveys);

    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ 
            message: 'Error fetching surveys',
            error: error.message
        });
    }
};

export const serveSurveyFile = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Serving survey file for id:', id);

        const [surveys] = await db.query(
            'SELECT title, file_path, file_mimetype FROM surveys WHERE id = ? AND status = 1',
            [id]
        );

        if (surveys.length === 0) {
            console.log('No survey found in database for ID:', id);
            return res.status(404).json({ message: 'Survey not found' });
        }

        const survey = surveys[0];
        console.log('Survey record found:', survey);

        const uploadDir = getUploadDirectory();
        const fileName = path.basename(survey.file_path);
        const absolutePath = path.join(uploadDir, fileName);
        console.log('Resolved file path:', absolutePath);

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
            console.error(`File not found at path: ${absolutePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set headers for file viewing
        res.setHeader('Content-Type', survey.file_mimetype);
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(survey.file_path)}"`);

        // Stream the file
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            res.status(500).json({ message: 'Error streaming file' });
        });

    } catch (error) {
        console.error('Error serving survey file:', error);
        res.status(500).json({ 
            message: 'Error serving survey file',
            error: error.message
        });
    }
};

export const downloadSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Downloading survey for ID:', id);

        const [surveys] = await db.query(
            'SELECT title, file_path, file_mimetype FROM surveys WHERE id = ? AND status = 1',
            [id]
        );

        if (surveys.length === 0) {
            console.log('No survey found in database for ID:', id);
            return res.status(404).json({ message: 'Survey not found' });
        }

        const survey = surveys[0];
        console.log('Survey record found:', survey);

        const uploadDir = getUploadDirectory();
        const fileName = path.basename(survey.file_path);
        const absolutePath = path.join(uploadDir, fileName);
        console.log('Resolved file path:', absolutePath);

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
            console.error(`File not found at path: ${absolutePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Create sanitized filename
        const safeTitle = survey.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileExt = path.extname(survey.file_path);
        const downloadFilename = `${safeTitle}${fileExt}`;

        console.log('Sending file:', {
            path: absolutePath,
            filename: downloadFilename,
            mimetype: survey.file_mimetype
        });

        // Set headers for download
        res.setHeader('Content-Type', survey.file_mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

        // Stream the file
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            res.status(500).json({ message: 'Error streaming file' });
        });

    } catch (error) {
        console.error('Error downloading survey:', error);
        res.status(500).json({ 
            message: 'Error downloading survey',
            error: error.message
        });
    }
};
