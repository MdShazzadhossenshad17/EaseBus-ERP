/**
 * EaseBus ERP — Backend Auth Controller
 * Handles user authentication, session validation, and permissions
 */

export const AuthController = {
  login(req, res) {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    // Role-based auth mock matching ERP admin
    const user = {
      id: 1,
      username: username.trim(),
      name: username.toLowerCase().includes('admin') ? 'Administrator' : 'Operations Manager',
      role: username.toLowerCase().includes('admin') ? 'admin' : 'manager',
      permissions: ['read', 'write', 'delete', 'export', 'reports', 'settings']
    };

    return res.json({
      status: 'success',
      message: 'Authentication successful',
      user,
      token: 'easebus-jwt-auth-session-token-v4'
    });
  },

  getSession(req, res) {
    // Return unauthorized by default when no token provided
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        authenticated: false,
        message: 'No active session found. Please log in.'
      });
    }

    return res.json({
      status: 'success',
      authenticated: true,
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        name: 'System Administrator'
      }
    });
  },

  logout(req, res) {
    return res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  }
};

export default AuthController;
