import { Router } from 'express';
import { login } from '../../public/authController.js';

const router = Router();

router.post('/login', login);

export default router;