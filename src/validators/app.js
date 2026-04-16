import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.json({ message: 'Nexoria server is running' }));

export default app;