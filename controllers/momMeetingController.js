import db from '../config/db.js';
import multer from 'multer';

// Use memory storage for storing file data in RAM
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadMomMeeting = async (req, res) => {
    try {
        const { title, date } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'File is required' });
        }

        const query = `INSERT INTO minutesofmeeting (title, date, file_name, file_data, file_mimetype) VALUES (?, ?, ?, ?, ?)`;
        const values = [title, date, file.originalname, file.buffer, file.mimetype];

        await db.query(query, values); // Ensure 'db' is correctly imported

        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error('Error inserting file info:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
const getMomMeetings = async (req, res) => {
    try {
        const query = `SELECT * FROM minutesofmeeting WHERE status = 1 ORDER BY date DESC`;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const deleteMomMeeting = async (req, res) => {
    try {
        const { id } = req.params;

        // Set status to 0 instead of deleting
        const query = `UPDATE minutesofmeeting SET status = 0 WHERE id = ?`;
        await db.query(query, [id]);

        res.json({ message: 'File marked as deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export { uploadMomMeeting, upload, getMomMeetings, deleteMomMeeting };
