import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes.js';
import dangerZonesRouter from "../controllers/geomapcontroller.js"
import senario from '../routes/scenario.js'
import portfeil from '../routes/portfolio.js'

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); 
app.use('/api/scenario', senario );
app.use('/api/portfolio', portfeil);
app.use('/api/auth', authRoutes);
app.use("/api", dangerZonesRouter);
app.get('/', (req, res) => res.json({ message: 'Nexoria server is running' }));

export default app;