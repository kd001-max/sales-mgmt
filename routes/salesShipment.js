/**
 * 销售发货子系统 API 路由
 */
const express = require('express');
const router = express.Router();
const bitableService = require('../services/bitableService');
const approvalService = require('../services/approvalService');
const botService = require('../services/botService');

// ============================================================
// 销售发货单
// ============================================================

/**
 * POST /api/sales-shipment/create
 * 创建销售发货单
 * 流程：业务员制单 → 部门领导审核 → 财务审批 → 仓库备货 → OQC确认 → 发货
 */
router.post('/create', async (req, res) => {
  try {
    const { salesOrderNo, customer, products, qty, unitPrice, batchType, salesman, remark } = req.body;

    const shipmentNo = `SH${Date.now()}`;
    const totalAmount = qty * unitPrice;

    const result = await bitableService.createRecord('sales_shipment', {
      '发货单号': shipmentNo,
      '关联销售订单号': salesOrderNo || '',
      '客户名称': customer,
      '产品编码': products,
      '发货数量': qty,
      '单价': unitPrice,
      '总金额': totalAmount,
      '批号': batchType || '销售订单号',
      '业务员': salesman,
      '部门审核': '待审核',
      '财务审核': '待审核',
      'OQC确认': '待确认',
      '是否已发货': '未发货',
      '放行条': '未开具',
      '备注': remark || '',
    });

    // 通知财务部审批
    await botService.notifyShipment(shipmentNo, customer, products);

    res.json({
      success: true,
      data: result,
      message: '发货单已创建，请提交部门审核',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/sales-shipment/list
 * 获取发货单列表
 */
router.get('/list', async (req, res) => {
  try {
    const { status, pageSize, pageToken } = req.query;
    const filters = [];
    if (status) {
      if (status === 'pending') {
        filters.push(`CurrentValue.[财务审核] = "待审核"`);
      } else if (status === 'shipped') {
        filters.push(`CurrentValue.[是否已发货] = "已发货"`);
      }
    }

    const result = await bitableService.listRecords('sales_shipment', {
      pageSize: parseInt(pageSize) || 500,
      pageToken,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sort: [{ field_name: '创建日期', desc: true }],
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-shipment/department-audit
 * 部门领导审核
 */
router.post('/department-audit', async (req, res) => {
  try {
    const { recordId, approved, comment } = req.body;
    await bitableService.updateRecord('sales_shipment', recordId, {
      '部门审核': approved ? '已审核' : '已驳回',
      '备注': comment || (approved ? '部门审核通过' : '部门审核驳回'),
    });

    if (approved) {
      // 自动提交财务审批
      await botService.sendTextMessage(
        `📋 **发货单待财务审批**\n发货单号已通过部门审核，请财务部审批。`,
        '📋 财务待审批'
      );
    }

    res.json({ success: true, message: approved ? '部门审核通过，已提交财务审批' : '审核已驳回' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-shipment/finance-audit
 * 财务审批
 */
router.post('/finance-audit', async (req, res) => {
  try {
    const { recordId, approved, comment } = req.body;
    await bitableService.updateRecord('sales_shipment', recordId, {
      '财务审核': approved ? '已审核' : '已驳回',
      '备注': comment || (approved ? '财务审核通过，可发货' : '财务审核驳回'),
    });

    if (approved) {
      // 通知仓库备货
      const record = await bitableService.getRecord('sales_shipment', recordId);
      await botService.notifyShipment(
        record.fields['发货单号'],
        record.fields['客户名称'],
        record.fields['产品编码']
      );
    }

    res.json({ success: true, message: approved ? '财务审核通过，请仓库备货' : '财务驳回' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-shipment/confirm-oqc
 * OQC出货确认
 */
router.post('/confirm-oqc', async (req, res) => {
  try {
    const { recordId, confirmed, checkedItems } = req.body;
    const itemsChecked = checkedItems || {};
    // OQC检查项确认
    await bitableService.updateRecord('sales_shipment', recordId, {
      'OQC确认': confirmed ? '已确认' : '待确认',
      '备注': confirmed ? 'OQC出货检验通过' : 'OQC检验未通过',
    });

    if (confirmed) {
      await botService.sendTextMessage(
        `✅ **OQC确认**\n发货单产品已通过OQC检验，可以装柜发货。`,
        '✅ OQC已确认'
      );
    }

    res.json({ success: true, message: confirmed ? 'OQC确认完成，可以装柜' : 'OQC检验未通过' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-shipment/confirm-ship
 * 确认已发货
 */
router.post('/confirm-ship', async (req, res) => {
  try {
    const { recordId, tailBoxQty, passNo } = req.body;
    await bitableService.updateRecord('sales_shipment', recordId, {
      '是否已发货': '已发货',
      '尾数箱数量': tailBoxQty || 0,
      '放行条': passNo ? '已开具' : '未开具',
      '发货日期': new Date().toISOString().split('T')[0],
    });

    // 更新关联销售订单状态
    const record = await bitableService.getRecord('sales_shipment', recordId);
    const orderNo = record.fields['关联销售订单号'];
    if (orderNo) {
      // 查找对应销售订单并更新状态
      const orderList = await bitableService.listRecords('sales_order', {
        filter: `CurrentValue.[订单编号] = "${orderNo}"`,
      });
      if (orderList.items && orderList.items.length > 0) {
        await bitableService.updateRecord('sales_order', orderList.items[0].record_id, {
          '当前节点': '已发货',
        });
      }
    }

    res.json({ success: true, message: '发货确认完成，放行条已开具' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/sales-shipment/prepare
 * 仓库备货确认（提前备货，用于散货需提前一天的场景）
 */
router.post('/prepare', async (req, res) => {
  try {
    const { recordId } = req.body;
    await bitableService.updateRecord('sales_shipment', recordId, {
      '是否已发货': '已备货',
    });
    res.json({ success: true, message: '备货确认，已通知仓管员提前备货' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/sales-shipment/stats
 * 发货统计
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const result = await bitableService.listRecords('sales_shipment', { pageSize: 500 });
    const items = result.items || [];
    res.json({
      success: true,
      data: {
        total: items.length,
        pendingDeptAudit: items.filter(i => i.fields['部门审核'] === '待审核').length,
        pendingFinanceAudit: items.filter(i => i.fields['财务审核'] === '待审核').length,
        pendingOQC: items.filter(i => i.fields['OQC确认'] === '待确认').length,
        shipped: items.filter(i => i.fields['是否已发货'] === '已发货').length,
        preparing: items.filter(i => i.fields['是否已发货'] === '已备货').length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
