/**
 * 飞书OAuth登录认证服务
 * 用于获取飞书用户身份信息（用户ID、姓名、邮箱、手机等）
 * 
 * 使用流程：
 * 1. 用户访问应用 → 重定向到飞书OAuth授权页
 * 2. 用户授权 → 飞书回调到 redirect_uri
 * 3. 服务端用code换取access_token → 获取用户信息
 * 4. 生成session token存入cookie → 前端后续请求携带
 */

const { client } = require('../config/feishu');

// 飞书登录需要的配置
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

// 简单内存session存储（生产环境建议用redis）
const sessions = new Map();

class AuthService {

  /**
   * 获取飞书OAuth登录URL
   * 用户访问此URL即跳转到飞书授权页面
   */
  getLoginUrl(state = '') {
    const baseUrl = 'https://open.feishu.cn/open-apis/authen/v1/index';
    const params = new URLSearchParams({
      redirect_uri: REDIRECT_URI,
      app_id: APP_ID,
      state: state || Math.random().toString(36).slice(2),
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 用授权码换取用户信息
   * @param {string} code - 飞书授权回调的code
   * @returns {object} 用户信息
   */
  async getUserInfoByCode(code) {
    try {
      // 1. 获取 tenant_access_token
      const tokenResp = await client.authen.accessToken({
        data: {
          grant_type: 'authorization_code',
          code: code,
        },
      });

      if (!tokenResp.data || !tokenResp.data.access_token) {
        throw new Error('获取access_token失败');
      }

      const accessToken = tokenResp.data.access_token;

      // 2. 使用access_token获取用户信息
      const userResp = await client.authen.userInfo({
        query: { token: accessToken },
      });

      if (!userResp.data) {
        throw new Error('获取用户信息失败');
      }

      const userInfo = userResp.data;
      
      // 3. 生成session
      const sessionId = this.createSession(userInfo);

      return {
        sessionId,
        user: this.formatUserInfo(userInfo),
      };
    } catch (err) {
      console.error('飞书OAuth登录失败:', err.message);
      throw err;
    }
  }

  /**
   * 创建用户session
   */
  createSession(userInfo) {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessions.set(sessionId, {
      ...this.formatUserInfo(userInfo),
      loginTime: Date.now(),
      expireTime: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
    });
    return sessionId;
  }

  /**
   * 通过sessionId获取用户信息
   */
  getUserBySession(sessionId) {
    if (!sessionId || !sessions.has(sessionId)) return null;
    const session = sessions.get(sessionId);
    if (Date.now() > session.expireTime) {
      sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  /**
   * 格式化飞书用户信息
   */
  formatUserInfo(raw) {
    return {
      userId: raw.user_id || '',
      openId: raw.open_id || '',
      name: raw.name || '',
      enName: raw.en_name || '',
      email: raw.email || '',
      mobile: raw.mobile || '',
      avatarUrl: raw.avatar_url || '',
      /**
       * 根据飞书用户ID获取部门信息（需配置通讯录权限）
       * 用于判断用户属于哪个业务角色
       */
      department: raw.department || '',
    };
  }

  /**
   * 销毁session（登出）
   */
  destroySession(sessionId) {
    sessions.delete(sessionId);
  }

  /**
   * 判断用户是否已登录（中间件使用）
   */
  isAuthenticated(req) {
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    return !!(sessionId && sessions.has(sessionId));
  }

  /**
   * 用app_access_token换取tenant_access_token
   * 用于服务端API调用
   */
  async getTenantAccessToken() {
    try {
      const resp = await client.authen.tenantAccessToken({
        data: {
          app_id: APP_ID,
          app_secret: APP_SECRET,
        },
      });
      return resp.data?.tenant_access_token;
    } catch (err) {
      console.error('获取tenant_access_token失败:', err.message);
      return null;
    }
  }
}

module.exports = new AuthService();
