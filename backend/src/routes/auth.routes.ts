import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', (req, res, next) => authController.login(req, res, next));
authRouter.post('/google', (req, res) => authController.googleLogin(req, res));
authRouter.get('/me', (req, res) => authController.getMe(req, res));
authRouter.post('/logout', (req, res) => authController.logout(req, res));

