/**
 * 销售生产管理系统 - 前端API封装
 * 所有后端API调用统一入口
 */

const API = {
  // 基础路径
  BASE: '/api',

  // ============================================================
  // 通用请求方法
  // ============================================================
  async request(url, options = {}) {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    try {
      const resp = await fetch(`${this.BASE}${url}`, config);
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || `请求失败: ${resp.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API请求失败 [${url}]:`, err);
      throw err;
    }
  },

  async get(url, params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    }
    const qs = query.toString();
    return this.request(`${url}${qs ? '?' + qs : ''}`);
  },

  async post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ============================================================
  // 系统状态
  // ============================================================
  getConfigStatus() {
    return this.get('/config/status');
  },

  healthCheck() {
    return this.get('/health');
  },

  // ============================================================
  // 销售订货 API
  // ============================================================
  salesOrder: {
    list(params) { return API.get('/sales-order/list', params); },
    get(id) { return API.get(`/sales-order/${id}`); },
    create(data) { return API.post('/sales-order/create', data); },
    submitReview(data) { return API.post('/sales-order/submit-review', data); },
    engineeringReview(data) { return API.post('/sales-order/engineering-review', data); },
    planningReview(data) { return API.post('/sales-order/planning-review', data); },
    confirm(data) { return API.post('/sales-order/confirm', data); },
    change(data) { return API.post('/sales-order/change', data); },
    stats() { return API.get('/sales-order/stats/overview'); },
  },

  // ============================================================
  // 生产计划 API
  // ============================================================
  productionPlan: {
    // 工单
    generateOrder(data) { return API.post('/production-plan/order/generate', data); },
    listOrders(params) { return API.get('/production-plan/order/list', params); },
    updateOrderStatus(data) { return API.post('/production-plan/order/update-status', data); },
    // 排程
    createSchedule(data) { return API.post('/production-plan/schedule/create', data); },
    // 每日计划
    createDailyPlan(data) { return API.post('/production-plan/daily/create', data); },
    listDailyPlans(params) { return API.get('/production-plan/daily/list', params); },
    completeDailyPlan(data) { return API.post('/production-plan/daily/complete', data); },
    // 周计划
    createWeeklyPlan(data) { return API.post('/production-plan/weekly/create', data); },
    updateMaterialInfo(data) { return API.post('/production-plan/weekly/update-material', data); },
    // 调整
    adjustPlan(data) { return API.post('/production-plan/adjust', data); },
  },

  // ============================================================
  // 物料管控 API
  // ============================================================
  materialControl: {
    listMaterials(params) { return API.get('/material-control/material/list', params); },
    createIssue(data) { return API.post('/material-control/issue/create', data); },
    transferMaterial(data) { return API.post('/material-control/issue/transfer', data); },
    confirmIssue(data) { return API.post('/material-control/issue/confirm', data); },
    createReturnReq(data) { return API.post('/material-control/return-req/create', data); },
    approveReturnReq(data) { return API.post('/material-control/return-req/approve', data); },
    warehouseIn(data) { return API.post('/material-control/finish/warehouse-in', data); },
    stockStatus() { return API.get('/material-control/stock/status'); },
  },

  // ============================================================
  // 销售发货 API
  // ============================================================
  salesShipment: {
    create(data) { return API.post('/sales-shipment/create', data); },
    list(params) { return API.get('/sales-shipment/list', params); },
    departmentAudit(data) { return API.post('/sales-shipment/department-audit', data); },
    financeAudit(data) { return API.post('/sales-shipment/finance-audit', data); },
    confirmOQC(data) { return API.post('/sales-shipment/confirm-oqc', data); },
    confirmShip(data) { return API.post('/sales-shipment/confirm-ship', data); },
    prepare(data) { return API.post('/sales-shipment/prepare', data); },
    stats() { return API.get('/sales-shipment/stats/overview'); },
  },
};

// ============================================================
// 全局当前用户
// ============================================================
let currentUser = null;

/**
 * 初始化用户认证
 * 检查是否已登录，获取用户信息
 */
async function initAuth() {
  try {
    const resp = await API.auth.userinfo();
    if (resp.loggedIn) {
      currentUser = resp.user;
    }
    return currentUser;
  } catch (err) {
    console.warn('用户认证检查失败:', err.message);
    return null;
  }
}

/**
 * 跳转到飞书登录页
 */
function goLogin() {
  window.location.href = '/api/auth/login';
}

/**
 * 获取用户显示名（带部门）
 */
function getUserDisplay() {
  if (!currentUser) return '未登录';
  const dept = currentUser.department ? `(${currentUser.department})` : '';
  return `${currentUser.name}${dept}`;
}

// ============================================================
// 认证 API
// ============================================================
API.auth = {
  userinfo() { return API.get('/auth/userinfo'); },
  logout() { return API.post('/auth/logout'); },
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取状态样式类名
 */
function getStatusClass(status) {
  const map = {
    '待提交': 'status-pending',
    '待评审': 'status-pending',
    '工程评审中': 'status-reviewing',
    '计划评审中': 'status-reviewing',
    '评审完成': 'status-done',
    '已审核': 'status-done',
    '已完成': 'status-done',
    '已发货': 'status-done',
    '已取消': 'status-danger',
    '生产中': 'status-warning',
  };
  return map[status] || 'status-pending';
}

/**
 * Toast提示
 */
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 9999;
    color: #fff; background: ${type === 'error' ? '#ff3b30' : type === 'success' ? '#34c759' : '#3370ff'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 80%;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/**
 * 确认弹窗
 */
function showConfirm(msg, title = '确认操作') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:320px;border-radius:12px;">
        <div class="modal-header">
          <h3>${title}</h3>
        </div>
        <p style="margin-bottom:20px;color:#6b7280;">${msg}</p>
        <div class="approval-actions">
          <button class="btn btn-outline" id="confirmCancel">取消</button>
          <button class="btn btn-primary" id="confirmOk">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirmOk').onclick = () => {
      modal.remove();
      resolve(true);
    };
    document.getElementById('confirmCancel').onclick = () => {
      modal.remove();
      resolve(false);
    };
    modal.onclick = (e) => {
      if (e.target === modal) { modal.remove(); resolve(false); }
    };
  });
}
