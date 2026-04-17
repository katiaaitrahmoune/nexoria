import './node_modules/dotenv/config.js';
import app from './src/validators/app.js';
import pool from './src/config/db.js';

const PORT = process.env.PORT || 3000;


pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });