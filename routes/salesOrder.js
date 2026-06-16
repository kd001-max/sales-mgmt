/**
 * 销售订货子系统 API 路由
 */
const express = require('express');
const router = express.Router();
const bitableService = require('../services/bitableService');
const approvalService = require('../services/approvalService');
const botService = require('../services/botService');

// 表ID（按需配置或通过名称自动查找）
const TABLE_ID = 'sales_order';

/**
 * GET /api/sales-order/list
 * 获取销售订单列表（支持分页和筛选）
 */
router.get('/list', async (req, res) => {
  try {
    const { pageSize, pageToken, status, type } = req.query;
    const filter = [];
    if (status) filter.push(`CurrentValue.[当前节点] = "${status}"`);
    if (type) filter.push(`CurrentValue.[订单类型] = "${type}"`);

    const result = await bitableService.listRecords(TABLE_ID, {
      pageSize: parseInt(pageSize) || 500,
      pageToken,
      filter: filter.length > 0 ? filter.join(' AND ') : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/sales-order/:id
 * 获取单条订单详情
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await bitableService.getRecord(TABLE_ID, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-order/create
 * 创建销售订单
 * 业务流程：业务员录入 → 提交工程评审
 */
router.post('/create', async (req, res) => {
  try {
    const fields = {
      '订单编号': req.body.orderNo,
      '业务员': req.body.salesman,
      '客户名称': req.body.customer,
      '客户订单号': req.body.customerOrderNo,
      '销售部门': req.body.department,
      '订单类型': req.body.orderType || '标准订单',
      '订单产品明细': JSON.stringify(req.body.products || []),
      '订单数量': req.body.totalQty,
      '单价': req.body.unitPrice,
      '总金额': req.body.totalAmount,
      '交期日期': req.body.deliveryDate,
      '是否急插单': req.body.isRushOrder || '否',
      '是否有附页': req.body.hasAttachment || '无',
      '待确认需求': req.body.pendingConfirmInfo || '',
      '当前节点': '待提交',
      '工程评审状态': '待评审',
      '计划评审状态': '待评审',
    };

    const result = await bitableService.createRecord(TABLE_ID, fields);
    res.json({ success: true, data: result, message: '订单创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-order/submit-review
 * 提交订单评审（业务员提交 → 工程部评审）
 */
router.post('/submit-review', async (req, res) => {
  try {
    const recordId = req.body.recordId;
    // 更新订单状态为工程评审中
    await bitableService.updateRecord(TABLE_ID, recordId, {
      '当前节点': '工程评审中',
    });

    // 通过飞书审批流发送评审请求
    const record = await bitableService.getRecord(TABLE_ID, recordId);
    const orderData = record.fields;

    try {
      await approvalService.createSalesOrderApproval({
        userId: req.body.currentUserId,
        orderNo: orderData['订单编号'],
        customer: orderData['客户名称'],
        amount: orderData['总金额'],
        deliveryDate: orderData['交期日期'],
        orderType: orderData['订单类型'],
      });
    } catch (approvalErr) {
      console.warn('飞书审批创建失败（可继续）:', approvalErr.message);
    }

    // 发送飞书消息通知工程部
    await botService.notifyOrderReview(
      orderData['订单编号'],
      orderData['客户名称'],
      '工程部'
    );

    res.json({ success: true, message: '订单已提交工程评审' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-order/engineering-review
 * 工程部完成评审
 */
router.post('/engineering-review', async (req, res) => {
  try {
    const { recordId, result: reviewResult, bomInfo, reviewer } = req.body;
    await bitableService.updateRecord(TABLE_ID, recordId, {
      '工程评审状态': reviewResult ? '评审通过' : '评审不通过',
      '当前节点': '计划评审中',
      '订单BOM备注': bomInfo || '',
    });

    // 通知计划部进行交期评审
    const record = await bitableService.getRecord(TABLE_ID, recordId);
    await botService.notifyOrderReview(
      record.fields['订单编号'],
      record.fields['客户名称'],
      '计划部'
    );

    res.json({ success: true, message: '工程评审完成' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-order/planning-review
 * 计划部完成交期评审
 */
router.post('/planning-review', async (req, res) => {
  try {
    const { recordId, result: reviewResult, confirmedDeliveryDate, reviewer } = req.body;
    await bitableService.updateRecord(TABLE_ID, recordId, {
      '计划评审状态': reviewResult ? '评审通过' : '评审不通过',
      '评审交期': confirmedDeliveryDate,
      '当前节点': '评审完成',
    });

    // 通知业务部确认交期
    const record = await bitableService.getRecord(TABLE_ID, recordId);
    await botService.notifyOrderReview(
      record.fields['订单编号'],
      record.fields['客户名称'],
      '业务部（确认交期）'
    );

    res.json({ success: true, message: '交期评审完成' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-order/confirm
 * 业务部确认交期并审核
 */
router.post('/confirm', async (req, res) => {
  try {
    const { recordId, agreed } = req.body;
    await bitableService.updateRecord(TABLE_ID, recordId, {
      '当前节点': agreed ? '已审核' : '评审完成',
      '备注': agreed ? '业务部确认交期' : '业务部有异议，需协调',
    });

    res.json({ success: true, message: agreed ? '订单已审核通过' : '订单交期有异议，请协调' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-order/change
 * 订单变更
 */
router.post('/change', async (req, res) => {
  try {
    const { recordId, changeType, reason, newDeliveryDate, newContent } = req.body;
    const record = await bitableService.getRecord(TABLE_ID, recordId);
    const currentFields = record.fields;

    await bitableService.updateRecord(TABLE_ID, recordId, {
      '当前节点': '评审完成',
      '交期日期': newDeliveryDate || currentFields['交期日期'],
      '订单产品明细': newContent || currentFields['订单产品明细'],
      '备注': `[变更] ${changeType}: ${reason}`,
    });

    // 通知相关方
    await botService.notifyPlanChange(currentFields['订单编号'], reason);

    res.json({ success: true, message: '订单变更成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/sales-order/stats
 * 订单统计
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const result = await bitableService.listRecords(TABLE_ID, { pageSize: 500 });
    const items = result.items || [];
    res.json({
      success: true,
      data: {
        total: items.length,
        pending: items.filter(i => i.fields['当前节点'] === '待提交').length,
        engineeringReview: items.filter(i => i.fields['当前节点'] === '工程评审中').length,
        planningReview: items.filter(i => i.fields['当前节点'] === '计划评审中').length,
        completed: items.filter(i => i.fields['当前节点'] === '已审核').length,
        rushOrders: items.filter(i => i.fields['是否急插单'] === '是').length,
        shipped: items.filter(i => i.fields['当前节点'] === '已发货').length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
