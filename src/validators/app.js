import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes.js';
import dangerZonesRouter from "../controllers/geomapcontroller.js"
import senario from '../routes/scenario.js'
import portfeil from '../routes/portfolio.js'
import assetRouter from '../routes/assetRouter.js';
import locationRoutes from '../routes/lacation.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); 
app.use('/api/scenario', senario );
app.use('/api/portfolio', portfeil);
app.use('/api/auth', authRoutes);
app.use("/api", dangerZonesRouter);
app.use('/api/assets', assetRouter);
app.use('/api/locations', locationRoutes);
app.get('/', (req, res) => res.json({ message: 'Nexoria server is running' }));

export default app;