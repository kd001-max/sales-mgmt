/**
 * 飞书OAuth登录路由
 * 处理飞书扫码登录、回调、获取用户信息和登出
 */
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

/**
 * GET /api/auth/login
 * 重定向到飞书OAuth登录页面
 */
router.get('/login', (req, res) => {
  const loginUrl = authService.getLoginUrl();
  res.redirect(loginUrl);
});

/**
 * GET /api/auth/callback
 * 飞书OAuth回调地址
 * 用户授权后飞书会重定向到此地址，带上授权code
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect('/?login_error=缺少授权码');
  }

  try {
    const result = await authService.getUserInfoByCode(code);
    
    // 将sessionId写入cookie（前端可读取）
    res.cookie('session_id', result.sessionId, {
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      httpOnly: false,  // 允许前端读取
      sameSite: 'lax',
    });

    // 重定向回首页
    res.redirect('/');
  } catch (err) {
    console.error('登录回调处理失败:', err);
    res.redirect('/?login_error=登录失败，请重试');
  }
});

/**
 * GET /api/auth/userinfo
 * 获取当前登录用户信息（前端通过sessionId查询）
 */
router.get('/userinfo', (req, res) => {
  const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
  const user = authService.getUserBySession(sessionId);

  if (!user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    user: {
      name: user.name,
      enName: user.enName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      userId: user.userId,
      department: user.department,
    },
  });
});

/**
 * POST /api/auth/logout
 * 登出（销毁session）
 */
router.post('/logout', (req, res) => {
  const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
  if (sessionId) {
    authService.destroySession(sessionId);
    res.clearCookie('session_id');
  }
  res.json({ success: true, message: '已登出' });
});

module.exports = router;
