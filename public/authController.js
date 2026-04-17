import { loginUser } from '../src/services/authService.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const data = await loginUser(email, password);
    res.json({ message: 'Login successful', ...data });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};