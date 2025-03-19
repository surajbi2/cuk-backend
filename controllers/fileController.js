import db from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadFile = async (req, res) => {
    const { title, eventDate } = req.body;
    const file = req.file;
    
    console.log("Incoming file upload request:", { title, eventDate });
    console.log("File info:", file ? { 
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    } : 'No file');

    if (!file) {
        console.error('No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!title || !eventDate) {
        console.error('Missing required fields');
        return res.status(400).json({ message: 'Title and date are required' });
    }

    try {
        // Store the relative path to avoid full system path exposure
        const relativePath = path.join('uploads', file.filename);
        const absolutePath = path.join(__dirname, '..', relativePath);
        
        // Verify file was created
        if (!fs.existsSync(absolutePath)) {
            console.error('File not saved correctly');
            return res.status(500).json({ message: 'Failed to save file' });
        }

        // Insert record into database
        await db.query(
            `INSERT INTO notices (title, event_date, file_name, file_mimetype, file_path, status) 
             VALUES (?, ?, ?, ?, ?, ?)`, 
            [title, eventDate, file.originalname, file.mimetype, relativePath, 2]
        );

        res.status(201).json({ message: 'Notice submitted for admin approval.' });
    } catch (err) {
        console.error('Error inserting file info:', err);
        res.status(500).json({ message: 'Server error while processing upload' });
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
        const [rows] = await db.query(
            'SELECT file_name, file_mimetype, file_path FROM notices WHERE id = ?', 
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const file = rows[0];
        const filePath = path.join(__dirname, '..', file.file_path);

        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set appropriate headers based on file type
        res.setHeader('Content-Type', file.file_mimetype);
        
        // Send file for viewing (inline)
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ message: 'Server error while retrieving file' });
    }
};

// Function for downloading files with attachment disposition
export const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            'SELECT file_name, file_mimetype, file_path FROM notices WHERE id = ?', 
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const file = rows[0];
        const filePath = path.join(__dirname, '..', file.file_path);

        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
        res.setHeader('Content-Type', file.file_mimetype);
        
        // Send file as download
        res.download(filePath, file.file_name, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ message: 'Error downloading file' });
            }
        });
    } catch (err) {
        console.error('Error retrieving file for download:', err);
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