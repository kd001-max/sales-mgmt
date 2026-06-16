/**
 * 表名 ↔ 飞书实际表ID 映射
 * 
 * 运行 node bitable/getMapping.js 可重新生成此映射
 * 注意：重新创建表后，table_id 会变化，需重新生成
 */
const TABLE_MAP = {
  '销售订单': 'tblBZZFzkxPurfhE',
  '产品BOM': 'tblgMmDrtGf7Azgr',
  '物料主档': 'tbldSquSwJcAexsY',
  '生产工单': 'tblhGqxrrP5hiZAL',
  '生产排程': 'tblqQrMpJwnvBQMA',
  '每日生产计划': 'tblRTCSZNzvw7XoX',
  '周生产排程表': 'tblcslRqRAunYDQP',
  '生产发料单': 'tbl8sIz2vpVp1Ns2',
  '退补料申请单': 'tblFr4MgScxfHi2V',
  '销售发货单': 'tbl8X7k1HoILwuW1',
  '预测需求计划': 'tblfzqvcLISLIj6E',
  '订单变更通知单': 'tbl3nHrmOV4lgYfm',
  '联络单': 'tblF7k8n8rF7SbrZ',
  '产品生产周期表': 'tblI2IjTk4EzLgwW',
  'KPI统计': 'tblCCwe0Z3AdDB7G',
  '生产订单损耗统计表': 'tbltA80DQ97kc1AA',
};

/**
 * 根据表名获取飞书实际table_id
 * @param {string} name - 表中文名，如'销售订单'
 * @returns {string} 实际table_id
 */
function getTableId(name) {
  const id = TABLE_MAP[name];
  if (!id) {
    throw new Error(`未找到表的映射: ${name}，请检查 services/tableMapper.js`);
  }
  return id;
}

/**
 * 根据英文key获取table_id（兼容旧代码）
 * @param {string} key - 如 'sales_order'
 * @returns {string} 实际table_id
 */
function resolveKey(key) {
  const nameMap = {
    'sales_order': '销售订单',
    'product_bom': '产品BOM',
    'material': '物料主档',
    'production_order': '生产工单',
    'production_schedule': '生产排程',
    'daily_plan': '每日生产计划',
    'weekly_schedule': '周生产排程表',
    'material_issue': '生产发料单',
    'material_return_req': '退补料申请单',
    'sales_shipment': '销售发货单',
    'demand_forecast': '预测需求计划',
    'order_change_notice': '订单变更通知单',
    'contact_note': '联络单',
    'production_cycle': '产品生产周期表',
    'kpi_statistics': 'KPI统计',
    'waste_statistics': '生产订单损耗统计表',
  };
  const name = nameMap[key];
  if (!name) {
    throw new Error(`未知表key: ${key}`);
  }
  return getTableId(name);
}

module.exports = { TABLE_MAP, getTableId, resolveKey };
