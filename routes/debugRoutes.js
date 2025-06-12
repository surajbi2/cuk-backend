import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/debug-notices', async (req, res) => {
    try {
        const [notices] = await db.query('SELECT * FROM notices');
        res.json(notices);
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Debug route for surveys
router.get('/debug-surveys', async (req, res) => {
    try {
        const [surveys] = await db.query('SELECT * FROM surveys');
        res.json(surveys);
    } catch (err) {
        console.error('Error fetching surveys:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get table structure
router.get('/table-info/:table', async (req, res) => {
    try {
        const [columns] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [process.env.DB_NAME || 'iqac', req.params.table]);
        res.json(columns);
    } catch (err) {
        console.error('Error fetching table info:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
