import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail } from '../models/userModel.js';

export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
};