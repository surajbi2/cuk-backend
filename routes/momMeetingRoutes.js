import express from 'express';
import { uploadMomMeeting } from '../controllers/momMeetingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import db from '../config/db.js';
import multer from 'multer';
import { deleteMomMeeting } from '../controllers/momMeetingController.js';
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/mom-upload', authenticateToken, upload.single('file'), uploadMomMeeting);

router.get('/reports', async (req, res) => {
    try {
      const [results] = await db.query('SELECT id, title, date, file_name FROM minutesofmeeting WHERE status = 1');
      // console.log("results", results);
      res.json(results);
    } catch (err) {
      console.error('Error fetching reports:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.delete('/reports/:id', deleteMomMeeting);
export default router;
