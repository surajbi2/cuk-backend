import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine upload path based on environment
const getUploadPath = () => {
    if (process.env.NODE_ENV === 'production') {
        // Use Render's persistent storage directory
        const uploadPath = '/opt/render/project/public/uploads';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        console.log('Using production upload path:', uploadPath);
        return uploadPath;
    } else {
        // Use local development path
        const uploadPath = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        console.log('Using development upload path:', uploadPath);
        return uploadPath;
    }
};

// Configure multer disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = getUploadPath();
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// File filter function to validate uploads
const fileFilter = (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'));
    }
};

// Create and export the multer instance with configuration
export const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    }
});

// Export the function to get upload path for use in other files
export const getUploadDirectory = getUploadPath;