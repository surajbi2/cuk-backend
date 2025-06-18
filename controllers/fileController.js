import db from '../config/db.js';
import multer from 'multer';
import { getUploadDirectory } from '../config/multerConfig.js';
// Use memory storage for storing file data in RAM
const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadFile = async (req, res) => {
    try {
        console.log('\n=== File Upload Request ===');
        console.log('Upload request headers:', {
            contentType: req.headers['content-type'],
            authorization: req.headers.authorization ? 'present' : 'missing'
        });
        
        const { title, eventDate } = req.body;
        const file = req.file;
        
        console.log('Request body:', {
            title,
            eventDate,
            hasFile: !!file
        });
        
        if (file) {
            console.log('File details:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                buffer: file.buffer ? `${file.buffer.length} bytes` : 'missing'
            });
        }

        if (!file) {
            console.error('No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!title || !eventDate) {
            console.error('Missing required fields:', { title, eventDate });
            return res.status(400).json({ message: 'Title and date are required' });
        }        // Insert record into database with file data        console.log('Attempting database insert with values:', {
            title,
            eventDate,
            fileName: file.originalname,
            mimeType: file.mimetype,
            bufferLength: file.buffer ? file.buffer.length : 0,
            status: 2
        });

        const [result] = await db.query(
            `INSERT INTO notices (title, event_date, file_name, file_mimetype, file_data, status) 
             VALUES (?, ?, ?, ?, ?, ?)`, 
            [title, eventDate, file.originalname, file.mimetype, file.buffer, 2]
        );

        console.log('Database insert result:', {
            insertId: result.insertId,
            affectedRows: result.affectedRows,
            serverStatus: result.serverStatus
        });

        // Verify the inserted record
        const [verification] = await db.query(
            'SELECT id, title, file_name, status, LENGTH(file_data) as data_length FROM notices WHERE id = ?',
            [result.insertId]
        );
        
        console.log('Verification of inserted record:', verification[0]);

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
        console.log('\n=== Serve File Request ===');
        console.log('Request Headers:', {
            authorization: req.headers.authorization ? 'present' : 'missing',
            'x-admin-access': req.headers['x-admin-access'],
            accept: req.headers.accept
        });
        console.log('Notice ID:', id);

        // Check if admin is accessing pending notice
        const isAdmin = req.headers['x-admin-access'] === 'true';
        console.log('Is Admin Access:', isAdmin);
        
        // First, check if the notice exists at all
        const [checkNotice] = await db.query(
            'SELECT id, status FROM notices WHERE id = ?',
            [id]
        );
        
        console.log('Initial notice check:', checkNotice.length ? {
            id: checkNotice[0].id,
            status: checkNotice[0].status
        } : 'No notice found');

        if (checkNotice.length === 0) {
            return res.status(404).json({ 
                message: 'Notice not found',
                detail: 'No notice exists with this ID'
            });
        }

        // Now get the full notice data with appropriate status check
        const [notices] = await db.query(
            'SELECT file_name, file_mimetype, file_data, status FROM notices WHERE id = ? AND (status = 1 OR (status = 2 AND ?))',
            [id, isAdmin]
        );

        console.log('File query result:', {
            found: notices.length > 0,
            status: notices.length ? notices[0].status : 'N/A',
            isAdminAccess: isAdmin,
            hasData: notices.length ? !!notices[0].file_data : false
        });

        if (notices.length === 0) {
            const errorMessage = isAdmin ? 
                'File not found' : 
                'This notice is pending approval';
            return res.status(404).json({ 
                message: errorMessage,
                detail: `Notice status: ${checkNotice[0].status}, Admin access: ${isAdmin}`
            });
        }

        const notice = notices[0];
        
        if (!notice.file_data) {
            console.error('File data is missing for notice:', id);
            return res.status(404).json({ 
                message: 'File data not found',
                detail: 'The file content is missing from the database'
            });
        }

        console.log('Serving file:', {
            fileName: notice.file_name,
            mimeType: notice.file_mimetype,
            dataSize: notice.file_data.length
        });

        // Set response headers
        res.setHeader('Content-Type', notice.file_mimetype);
        res.setHeader('Content-Disposition', `inline; filename="${notice.file_name}"`);

        // Send file data
        res.send(notice.file_data);

    } catch (error) {
        console.error('Error in serveFile:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                message: 'Server error while serving file',
                error: error.message
            });
        }
    }
};

// Function for downloading files with attachment disposition
export const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Download request for notice ID:', id);        // Check if admin is accessing pending notice
        const isAdmin = req.headers['x-admin-access'] === 'true';
        
        // Get file info and data from database
        const [notices] = await db.query(
            'SELECT title, file_name, file_mimetype, file_data, status FROM notices WHERE id = ? AND (status = 1 OR (status = 2 AND ?))',
            [id, isAdmin]
        );

        if (notices.length === 0) {
            console.log('No notice found in database for ID:', id);
            return res.status(404).json({ message: 'Notice not found' });
        }

        const notice = notices[0];
        console.log('Notice record found:', { 
            title: notice.title, 
            file_name: notice.file_name, 
            file_mimetype: notice.file_mimetype 
        });

        if (!notice.file_data) {
            console.error('No file data found in database');
            return res.status(404).json({ message: 'File data not found' });
        }

        // Set response headers
        res.setHeader('Content-Type', notice.file_mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${notice.file_name}"`);
        
        // Send the file data directly from the database
        res.send(notice.file_data);

    } catch (error) {
        console.error('Error downloading file:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error while downloading file' });
        }
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