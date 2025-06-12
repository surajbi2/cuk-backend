import db from './db.js';

async function initializeTables() {
    try {
        // Create surveys table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS surveys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                year VARCHAR(10) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_mimetype VARCHAR(100) NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TINYINT DEFAULT 1,
                INDEX idx_status (status)
            )
        `);
        console.log('✅ Surveys table initialized');

        // Verify table exists
        const [tables] = await db.query('SHOW TABLES LIKE "surveys"');
        console.log('Tables check:', tables);

        // Check table structure
        const [columns] = await db.query('DESCRIBE surveys');
        console.log('Surveys table structure:', columns);

        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing database tables:', error);
        throw error;
    }
}

export default initializeTables;
