import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, role, password } = req.body;
      const cleanEmail = email || username || 'admin@siliconlabs.internal';
      const cleanRole = role || 'admin';

      const session = await authService.login(cleanEmail, cleanRole, password);

      res.json({
        success: true,
        data: session,
        message: 'Authenticated successfully',
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: { message: err.message || 'Authentication failed' },
      });
    }
  }

  async googleLogin(req: Request, res: Response) {
    try {
      const { email, name, avatar } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          error: { message: 'Google email is required' },
        });
      }

      const session = await authService.loginWithGoogle(email, name, avatar);

      res.json({
        success: true,
        data: session,
        message: 'Authenticated with Google SSO successfully',
      });
    } catch (err: any) {
      res.status(403).json({
        success: false,
        error: { message: err.message || 'Google authentication failed' },
      });
    }
  }

  async getMe(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);

    const session = token ? authService.getSessionByToken(token) : null;
    if (!session) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized or session expired', statusCode: 401 },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  }

  async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);

    if (token) {
      authService.invalidateSession(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
