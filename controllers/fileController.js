import db from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getUploadDirectory } from '../config/multerConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadFile = async (req, res) => {
    try {
        console.log('Upload request headers:', req.headers);
        const { title, eventDate } = req.body;
        const file = req.file;
        
        console.log("Incoming file upload request:", { 
            title, 
            eventDate,
            body: req.body,
            file: file ? {
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            } : 'No file'
        });

        if (!file) {
            console.error('No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!title || !eventDate) {
            console.error('Missing required fields:', { title, eventDate });
            return res.status(400).json({ message: 'Title and date are required' });
        }

        // Store the relative path to avoid full system path exposure
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

        // Insert record into database
        const [result] = await db.query(
            `INSERT INTO notices (title, event_date, file_name, file_mimetype, file_path, status) 
             VALUES (?, ?, ?, ?, ?, ?)`, 
            [title, eventDate, file.originalname, file.mimetype, relativePath, 2]
        );

        console.log('Database insert result:', result);

        res.status(201).json({ 
            message: 'Notice submitted for admin approval.',
            fileInfo: {
                id: result.insertId,
                title,
                eventDate,
                filename: file.originalname
            }
        });
    } catch (err) {
        console.error('Error in uploadFile:', err);
        res.status(500).json({ 
            message: 'Server error while processing upload',
            error: err.message
        });
    }
};

export const getNotices = async (req, res) => {
    try {
        const [notices] = await db.query(
            "SELECT id, title, event_date, uploaded_at FROM notices WHERE status = 1 ORDER BY uploaded_at DESC"
        );
        res.json(notices);
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).json({ message: 'Server error while fetching notices' });
    }
};

export const getPendingNotices = async (req, res) => {
    try {
        const [pendingNotices] = await db.query(
            "SELECT id, title, event_date, uploaded_at FROM notices WHERE status = 2 ORDER BY uploaded_at DESC"
        );
        res.json(pendingNotices);
    } catch (err) {
        console.error('Error fetching pending notices:', err);
        res.status(500).json({ message: 'Server error while fetching pending notices' });
    }
};

export const deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;

        const [notice] = await db.query(`SELECT id FROM notices WHERE id = ?`, [id]);
        if (notice.length === 0) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        await db.query(`UPDATE notices SET status = 0 WHERE id = ?`, [id]);

        res.json({ message: 'Notice deleted successfully' });
    } catch (err) {
        console.error('Error deleting notice:', err);
        res.status(500).json({ message: 'Server error while deleting notice' });
    }
};

// Function for viewing files without auto-download
export const serveFile = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Serving file for ID:', id);
        
        const [rows] = await db.query(
            'SELECT file_name, file_mimetype, file_path FROM notices WHERE id = ?', 
            [id]
        );

        if (rows.length === 0) {
            console.log('No file found in database for ID:', id);
            return res.status(404).json({ message: 'File not found' });
        }

        const file = rows[0];
        console.log('File record found:', file);
        
        const absolutePath = path.resolve(__dirname, '..', file.file_path);
        console.log('Resolved absolute path:', absolutePath);

        if (!fs.existsSync(absolutePath)) {
            console.error(`File not found at path: ${absolutePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set appropriate headers based on file type
        res.setHeader('Content-Type', file.file_mimetype);
        res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
        
        // Stream the file instead of using sendFile
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            res.status(500).json({ message: 'Error streaming file' });
        });
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ message: 'Server error while retrieving file' });
    }
};

// Function for downloading files with attachment disposition
export const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Download request for notice ID:', id);

        // Get file info from database
        const [notices] = await db.query(
            'SELECT title, file_name, file_mimetype, file_path FROM notices WHERE id = ? AND status = 1',
            [id]
        );

        if (notices.length === 0) {
            console.log('No notice found in database for ID:', id);
            return res.status(404).json({ message: 'Notice not found' });
        }

        const notice = notices[0];
        console.log('Notice record found:', notice);

        // Get the absolute path
        const uploadDir = getUploadDirectory();
        const fileName = path.basename(notice.file_path);
        const filePath = path.join(uploadDir, fileName);
        
        console.log('Resolved file path:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`File not found at path: ${filePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set headers for file download
        res.setHeader('Content-Type', notice.file_mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${notice.file_name}"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            res.status(500).json({ message: 'Error streaming file' });
        });

    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Server error while downloading file' });
    }
};

export const approveNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; 

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
        }

        const status = action === 'approve' ? 1 : -1; 

        const [result] = await db.query(
            'UPDATE notices SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        res.json({ 
            message: `Notice ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            status: status
        });
    } catch (error) {
        console.error('Error updating notice status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};