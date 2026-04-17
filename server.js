import dotenv from 'dotenv';
dotenv.config();

import app from './src/validators/app.js';
import pool from './src/config/db.js';

const PORT = process.env.PORT || 3000;

// Démarre le serveur sans attendre la DB
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Teste la DB en parallèle, sans bloquer
pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.warn('⚠️ Database unavailable:', err.message);
    console.warn('Routes sans DB continueront à fonctionner');
    // process.exit(1)  ← supprime ça
  });