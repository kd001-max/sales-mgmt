/**
 * 物料管控子系统 API 路由
 */
const express = require('express');
const router = express.Router();
const bitableService = require('../services/bitableService');
const approvalService = require('../services/approvalService');
const botService = require('../services/botService');

// ============================================================
// 物料主档
// ============================================================

/**
 * GET /api/material-control/material/list
 * 获取物料列表
 */
router.get('/material/list', async (req, res) => {
  try {
    const { category, pageSize, pageToken } = req.query;
    const filter = category ? `CurrentValue.[物料分类] = "${category}"` : undefined;
    const result = await bitableService.listRecords('material', {
      pageSize: parseInt(pageSize) || 500,
      pageToken,
      filter,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 生产发料单
// ============================================================

/**
 * POST /api/material-control/issue/create
 * 创建生产发料单（配比出库）
 */
router.post('/issue/create', async (req, res) => {
  try {
    const { moNo, materialCode, materialName, requiredQty, issueType } = req.body;
    const result = await bitableService.createRecord('material_issue', {
      '发料单号': `MI${Date.now()}`,
      '关联工单编号': moNo,
      '物料编码': materialCode,
      '物料名称': materialName,
      '应发数量': requiredQty,
      '实发数量': issueType === '按可用量发料' ? req.body.availableQty : requiredQty,
      '欠料数量': issueType === '按可用量发料' ? requiredQty - req.body.availableQty : 0,
      '发料类型': issueType || '正常发料',
      '发料状态': '未发料',
      '交接签字': '待签字',
    });
    res.json({ success: true, data: result, message: '发料单已创建' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/material-control/issue/transfer
 * 整卷/整盘料调拨（贴片类物料特殊处理）
 */
router.post('/issue/transfer', async (req, res) => {
  try {
    const { moNo, materialCode, qty, sourceWarehouse, targetWarehouse } = req.body;
    // 创建调拨记录（实际业务需调拨单 + 其他出入库单）
    const result = await bitableService.createRecord('material_issue', {
      '发料单号': `TR${Date.now()}`,
      '关联工单编号': moNo,
      '物料编码': materialCode,
      '应发数量': qty,
      '实发数量': qty,
      '发料类型': '调拨发料',
      '发料状态': '已交接',
      '备注': `调拨: ${sourceWarehouse} → ${targetWarehouse}`,
    });
    res.json({ success: true, data: result, message: '调拨单已创建' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/material-control/issue/confirm
 * 确认发料交接（仓管员与物料员签字）
 */
router.post('/issue/confirm', async (req, res) => {
  try {
    const { recordId, receiver, issuer } = req.body;
    await bitableService.updateRecord('material_issue', recordId, {
      '发料状态': '已交接',
      '交接签字': '已签字',
      '领料人': receiver,
      '发料人': issuer,
      '发料日期': new Date().toISOString().split('T')[0],
    });
    res.json({ success: true, message: '发料交接确认完成' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 退补料申请
// ============================================================

/**
 * POST /api/material-control/return-req/create
 * 创建退补料申请单
 */
router.post('/return-req/create', async (req, res) => {
  try {
    const { docType, transCategory, dept, groupCode, moNo, productCode, productName, orderQty, materialCode, qty, reason } = req.body;

    // 生成单据编号: 小组代码-年月(6位)+流水号(4位)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const serialNo = String(Math.floor(Math.random() * 9000) + 1000);
    const docNo = `${groupCode}-${yearMonth}${serialNo}`;

    const ratio = orderQty > 0 ? ((qty / orderQty) * 100).toFixed(2) : 0;
    const ratioNum = parseFloat(ratio);

    // 根据比例确定审批层级
    let approvalStatus = '草稿';
    if (docType === '退料') {
      if (ratioNum > 5) {
        approvalStatus = '经理审批'; // 超5%需经理批准
      } else {
        approvalStatus = '主管复核';
      }
    } else { // 补料
      if (ratioNum > 10) {
        approvalStatus = '总经理审批';
      } else if (ratioNum > 5) {
        approvalStatus = '副总审批';
      } else {
        approvalStatus = '物控加签';
      }
    }

    const result = await bitableService.createRecord('material_return_req', {
      '单据编号': docNo,
      '单据类型': docType,
      '收发类别': transCategory,
      '申请部门': dept,
      '生产小组': groupCode,
      '关联工单编号': moNo,
      '产品编码': productCode,
      '产品名称': productName,
      '订单数量': orderQty,
      '物料编码': materialCode,
      '退/补料数量': qty,
      '退/补料比例(%)': ratioNum,
      '原因说明': reason,
      '审批状态': approvalStatus,
    });

    // 如需更高级审批，创建飞书审批实例
    try {
      await approvalService.createMaterialReturnApproval({
        userId: req.body.currentUserId,
        docNo,
        docType,
        materialCode,
        quantity: qty,
        ratio: ratioNum,
      });
    } catch (approvalErr) {
      console.warn('飞书审批创建失败:', approvalErr.message);
    }

    res.json({ success: true, data: result, message: `${docType}申请单已创建，等待审批` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/material-control/return-req/approve
 * 退补料审批
 */
router.post('/return-req/approve', async (req, res) => {
  try {
    const { recordId, approveLevel, approved, comment } = req.body;
    const record = await bitableService.getRecord('material_return_req', recordId);
    const current = record.fields;
    const docType = current['单据类型'];
    const ratio = current['退/补料比例(%)'];
    const materialCategory = current['物料分类'] || 'C类';

    // 更新当前审批节点状态
    const updateFields = {};
    updateFields[`${approveLevel}审批`] = approved ? '通过' : '驳回';

    // 判断是否需要下一级审批
    let nextStatus = '';
    if (approved) {
      if (approveLevel === '组长') {
        nextStatus = '主管复核';
      } else if (approveLevel === '主管') {
        if (docType === '退料' && ratio > 5) {
          nextStatus = '经理审批';
        } else if (docType === '补料') {
          nextStatus = '物控加签';
        } else {
          nextStatus = '已完成';
        }
      } else if (approveLevel === '物控') {
        if (ratio > 5 && (materialCategory === 'A类')) {
          nextStatus = '副总审批';
        } else {
          nextStatus = '已完成';
        }
      } else if (approveLevel === '经理') {
        if (ratio > 10) {
          nextStatus = '总经理审批';
        } else {
          nextStatus = '已完成';
        }
      } else if (approveLevel === '副总' || approveLevel === '总经理') {
        nextStatus = '已完成';
      }
    } else {
      nextStatus = '草稿'; // 驳回后返回草稿
    }

    updateFields['审批状态'] = nextStatus;
    if (comment) updateFields['备注'] = comment;

    await bitableService.updateRecord('material_return_req', recordId, updateFields);

    res.json({
      success: true,
      message: approved ? `审批通过，当前状态: ${nextStatus}` : '审批驳回，已退回',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 生产完工入库
// ============================================================

/**
 * POST /api/material-control/finish/warehouse-in
 * 产成品/半成品入库
 */
router.post('/finish/warehouse-in', async (req, res) => {
  try {
    const { moNo, productCode, productName, qty, warehouse, type, batchNo } = req.body;
    // 批次号默认使用订单号
    const batch = batchNo || moNo;

    const result = await bitableService.createRecord('production_order', {
      '工单编号': moNo,
      '入库数量': qty,
      '工单状态': '已完成',
      '实际完工日期': new Date().toISOString().split('T')[0],
      // 实际场景中应更新产成品入库单表
    });

    res.json({ success: true, data: result, message: '入库完成' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 物料状态查询
// ============================================================

/**
 * GET /api/material-control/stock/status
 * 库存状态查询
 */
router.get('/stock/status', async (req, res) => {
  try {
    const result = await bitableService.listRecords('material', { pageSize: 500 });
    const items = result.items || [];
    const lowStock = items.filter(i => {
      const stock = i.fields['库存数量'] || 0;
      const safety = i.fields['安全库存'] || 0;
      return safety > 0 && stock <= safety;
    });

    res.json({
      success: true,
      data: {
        total: items.length,
        aClass: items.filter(i => i.fields['物料分类'] === 'A类').length,
        bClass: items.filter(i => i.fields['物料分类'] === 'B类').length,
        cClass: items.filter(i => i.fields['物料分类'] === 'C类').length,
        lowStockCount: lowStock.length,
        lowStockItems: lowStock.map(i => ({
          code: i.fields['物料编码'],
          name: i.fields['物料名称'],
          stock: i.fields['库存数量'],
          safety: i.fields['安全库存'],
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
