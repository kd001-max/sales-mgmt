/**
 * ============================================================
 *  销售生产管理系统 - 飞书集成版 后端服务器
 * ============================================================
 *  启动命令: npm start
 *  依赖: Node.js 16+, 飞书开放平台应用, 飞书多维表格
 *
 *  技术栈: Node.js + Express + 飞书SDK
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cookie解析中间件
const cookieParser = require('cookie-parser');

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 用户认证中间件（将用户信息注入request）
const authService = require('./services/authService');
app.use('/api', (req, res, next) => {
  const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
  const user = authService.getUserBySession(sessionId);
  if (user) {
    req.currentUser = user;
  }
  next();
});

// ============================================================
// 路由注册
// ============================================================

// 认证路由
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// API路由
const salesOrderRoutes = require('./routes/salesOrder');
const productionPlanRoutes = require('./routes/productionPlan');
const materialControlRoutes = require('./routes/materialControl');
const salesShipmentRoutes = require('./routes/salesShipment');

app.use('/api/sales-order', salesOrderRoutes);
app.use('/api/production-plan', productionPlanRoutes);
app.use('/api/material-control', materialControlRoutes);
app.use('/api/sales-shipment', salesShipmentRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    feishu_configured: !!(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
    bitable_configured: !!process.env.BITABLE_APP_TOKEN,
  });
});

// 前端页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4个子系统页面
const pageRoutes = [
  'sales-order',
  'production-plan',
  'material-control',
  'sales-shipment',
];

pageRoutes.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', `${page}.html`));
  });
});

// 系统配置状态接口（前端用于判断飞书是否已连接）
app.get('/api/config/status', (req, res) => {
  const feishuConnected = !!(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET);
  const bitableConnected = !!process.env.BITABLE_APP_TOKEN;
  const botConnected = !!process.env.BOT_WEBHOOK_URL;

  res.json({
    feishu: feishuConnected,
    bitable: bitableConnected,
    bot: botConnected,
    all_ready: feishuConnected && bitableConnected,
  });
});

// ============================================================
// 错误处理中间件
// ============================================================
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message,
  });
});

// 定时任务服务
const scheduleService = require('./services/scheduleService');

// 启动服务器
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log('========================================');
  console.log('  销售生产管理系统 - 飞书集成版');
  console.log('========================================');
  console.log(`  服务器启动: http://localhost:${PORT}`);
  console.log(`  API状态检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('  请将以下页面地址配置到飞书自定义应用:');
  console.log(`  - 主页面: http://localhost:${PORT}/`);
  console.log(`  - 销售订货: http://localhost:${PORT}/sales-order`);
  console.log(`  - 生产计划: http://localhost:${PORT}/production-plan`);
  console.log(`  - 物料管控: http://localhost:${PORT}/material-control`);
  console.log(`  - 销售发货: http://localhost:${PORT}/sales-shipment`);
  console.log('========================================');

  // 检查飞书配置
  if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
    console.warn('\n⚠️  警告: 飞书应用未配置');
    console.warn('   请复制 .env.example 为 .env，并填入飞书应用凭证');
  }
  if (!process.env.BITABLE_APP_TOKEN) {
    console.warn('⚠️  警告: 飞书多维表格未配置');
    console.warn('   请在 .env 中配置 BITABLE_APP_TOKEN');
  }

  // 启动定时任务（需要在.env中配置FEISHU相关参数才能正常工作）
  try {
    scheduleService.startAll();
  } catch (err) {
    console.warn('⚠️  定时任务启动失败（不影响系统运行）:', err.message);
  }
});
