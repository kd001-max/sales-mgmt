/**
 * 生产计划子系统 API 路由
 */
const express = require('express');
const router = express.Router();
const bitableService = require('../services/bitableService');
const botService = require('../services/botService');

// ============================================================
// 生产工单管理
// ============================================================

/**
 * POST /api/production-plan/order/generate
 * 从销售订单生成生产工单
 */
router.post('/order/generate', async (req, res) => {
  try {
    const { salesOrderNo, productCode, productName, materialCode, qty, dept, startDate, endDate } = req.body;

    // 生成工单编号: MO+年月(4位)+流水号(4位)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const serialNo = String(Math.floor(Math.random() * 9000) + 1000);
    const moNo = `MO${yearMonth}${serialNo}`;

    const result = await bitableService.createRecord('production_order', {
      '工单编号': moNo,
      '关联销售订单号': salesOrderNo,
      '产品编码': productCode,
      '产品名称': productName,
      '物料编码': materialCode,
      '工单数量': qty,
      '生产部门': dept,
      '开工日期': startDate,
      '完工日期': endDate,
      '工单状态': '待排程',
    });

    res.json({ success: true, data: result, message: `生产工单 ${moNo} 已生成` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/production-plan/order/list
 * 获取生产工单列表
 */
router.get('/order/list', async (req, res) => {
  try {
    const { status, pageSize, pageToken } = req.query;
    const filter = status ? `CurrentValue.[工单状态] = "${status}"` : undefined;

    const result = await bitableService.listRecords('production_order', {
      pageSize: parseInt(pageSize) || 500,
      pageToken,
      filter,
      sort: [{ field_name: '开工日期', desc: false }],
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/production-plan/order/update-status
 * 更新工单状态
 */
router.post('/order/update-status', async (req, res) => {
  try {
    const { recordId, status, actualStartDate, actualEndDate, completedQty } = req.body;
    const updateData = { '工单状态': status };
    if (actualStartDate) updateData['实际开工日期'] = actualStartDate;
    if (actualEndDate) updateData['实际完工日期'] = actualEndDate;
    if (completedQty !== undefined) updateData['入库数量'] = completedQty;

    await bitableService.updateRecord('production_order', recordId, updateData);
    res.json({ success: true, message: '工单状态已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 生产排程
// ============================================================

/**
 * POST /api/production-plan/schedule/create
 * 创建排程记录
 */
router.post('/schedule/create', async (req, res) => {
  try {
    const { moNo, processName, planDate, planQty, dailyCapacity } = req.body;
    const result = await bitableService.createRecord('production_schedule', {
      '排程编号': `PS${Date.now()}`,
      '关联工单编号': moNo,
      '工序名称': processName,
      '计划日期': planDate,
      '计划数量': planQty,
      '标准产能/天': dailyCapacity,
      '排程状态': '待执行',
    });
    res.json({ success: true, data: result, message: '排程已创建' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 每日生产计划
// ============================================================

/**
 * POST /api/production-plan/daily/create
 * 创建每日生产计划
 */
router.post('/daily/create', async (req, res) => {
  try {
    const { planDate, moNo, productCode, productName, qty, workshop, remark } = req.body;

    // 计算发放日期（提前3天）
    const issueDate = new Date(planDate);
    issueDate.setDate(issueDate.getDate() - 3);

    const result = await bitableService.createRecord('daily_plan', {
      '计划编号': `DP${planDate.replace(/-/g, '')}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
      '生产日期': planDate,
      '关联工单编号': moNo,
      '产品编码': productCode,
      '产品名称': productName,
      '计划数量': qty,
      '生产车间': workshop,
      '是否欠料': '否',
      '发放日期': issueDate.toISOString().split('T')[0],
      '计划状态': '未开始',
      '备注': remark || '',
    });
    res.json({ success: true, data: result, message: '每日生产计划已创建' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/production-plan/daily/list
 * 获取每日生产计划
 */
router.get('/daily/list', async (req, res) => {
  try {
    const { date, workshop } = req.query;
    const filters = [];
    if (date) filters.push(`CurrentValue.[生产日期] = DateTime(${new Date(date).getTime()})`);
    if (workshop) filters.push(`CurrentValue.[生产车间] = "${workshop}"`);

    const result = await bitableService.listRecords('daily_plan', {
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sort: [{ field_name: '生产日期', desc: true }],
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/production-plan/daily/complete
 * 更新每日计划完成情况
 */
router.post('/daily/complete', async (req, res) => {
  try {
    const { recordId, actualQty } = req.body;
    await bitableService.updateRecord('daily_plan', recordId, {
      '实际完成数量': actualQty,
      '完成率(%)': req.body.rate,
      '计划状态': '已完成',
    });
    res.json({ success: true, message: '计划完成情况已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 周计划排程表
// ============================================================

/**
 * POST /api/production-plan/weekly/create
 * 创建周生产计划排程表
 */
router.post('/weekly/create', async (req, res) => {
  try {
    const { weekNo, salesOrderNo, productCode, productName, qty, dept, issueDate } = req.body;
    const result = await bitableService.createRecord('weekly_schedule', {
      '排程编号': `WS${weekNo.replace(/[^0-9]/g, '')}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
      '周次': weekNo,
      '销售单号': salesOrderNo,
      '产品编码': productCode,
      '产品名称': productName,
      '计划数量': qty,
      '生产部门': dept,
      '物料状态': '正常',
      '下发日期': issueDate || new Date().toISOString().split('T')[0],
      '状态': '待下发',
    });
    res.json({ success: true, data: result, message: '周计划已创建' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/production-plan/weekly/update-material
 * MC更新物料信息
 */
router.post('/weekly/update-material', async (req, res) => {
  try {
    const { recordId, materialInfo, materialStatus } = req.body;
    await bitableService.updateRecord('weekly_schedule', recordId, {
      '物料信息': materialInfo,
      '物料状态': materialStatus || '正常',
    });
    res.json({ success: true, message: '物料信息已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 生产计划变更
// ============================================================

/**
 * POST /api/production-plan/adjust
 * 生产计划调整
 */
router.post('/adjust', async (req, res) => {
  try {
    const { planType, planId, newDate, newQty, reason } = req.body;
    const table = planType === 'daily' ? 'daily_plan' : 'weekly_schedule';

    await bitableService.updateRecord(table, planId, {
      '计划状态': '已调整',
      '备注': `[调整] ${reason}`,
    });

    // 通知相关部门
    await botService.notifyPlanChange(planId, reason);

    res.json({ success: true, message: '计划已调整，相关部门已通知' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
