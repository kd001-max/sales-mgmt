/**
 * ============================================================
 *  销售生产管理系统 - 飞书多维表格(Bitable) Schema 定义
 * ============================================================
 *
 * 本文件定义了系统的所有数据表结构。
 * 使用飞书 Bitabe 作为底层数据库，通过飞书开放 API 进行操作。
 *
 * 【数据表清单】
 * 1. sales_order          - 销售订单表
 * 2. product_bom          - 产品BOM表
 * 3. material             - 物料表
 * 4. production_order     - 生产工单表
 * 5. production_schedule  - 生产排程表
 * 6. daily_plan           - 每日生产计划表
 * 7. weekly_schedule      - 生产计划排程表(周)
 * 8. material_issue       - 生产发料单
 * 9. material_return_req  - 退补料申请单
 * 10. sales_shipment      - 销售发货单
 * 11. demand_forecast     - 预测需求计划
 * 12. order_change_notice - 订单变更通知单
 * 13. contact_note        - 联络单
 * 14. production_cycle    - 产品生产周期表
 * 15. kpi_statistics      - KPI统计表
 */

// ============================================================
// 表1：销售订单表 (Sales Order)
// ============================================================
const SALES_ORDER_TABLE = {
  table_name: '销售订单',
  table_key: 'sales_order',
  description: '存储所有销售订单信息，包括标准订单、预测订单、急插单等',
  fields: [
    { field_name: '订单编号', type: 'text', primary: true, description: '系统自动生成，如SO2026060001' },
    { field_name: '业务员', type: 'text', description: '订单录入人/负责人' },
    { field_name: '客户名称', type: 'text', is_lookup: false },
    { field_name: '客户订单号', type: 'text', description: '客户原始订单号' },
    { field_name: '销售部门', type: 'select', options: ['国际业务部', '国内市场部'], description: '国际业务部或国内市场部' },
    { field_name: '订单类型', type: 'select', options: ['标准订单', '预测订单', '急插单', '非标订单'], description: '预测订单无需评审流程' },
    { field_name: '订单产品明细', type: 'text', description: 'JSON格式存储产品编码、数量、单价等' },
    { field_name: '订单数量', type: 'number', description: 'PCS' },
    { field_name: '单价', type: 'number', description: '元/PCS' },
    { field_name: '总金额', type: 'number', description: '自动计算=数量×单价' },
    { field_name: '交期日期', type: 'date', description: '客户要求的交货日期' },
    { field_name: '评审交期', type: 'date', description: '计划部最终确认的交期' },
    { field_name: '当前节点', type: 'select',
      options: ['待提交', '工程评审中', '计划评审中', '评审完成', '已审核', '生产排程中', '生产中', '已入库', '已发货', '已结案', '已取消'],
      description: '订单当前所处的流程阶段' },
    { field_name: '工程评审状态', type: 'select', options: ['待评审', '评审中', '评审通过', '评审不通过'] },
    { field_name: '计划评审状态', type: 'select', options: ['待评审', '评审中', '评审通过', '评审不通过'] },
    { field_name: '是否急插单', type: 'select', options: ['否', '是'], description: '急插单需提前7个工作日' },
    { field_name: '是否有附页', type: 'select', options: ['无', '有'] },
    { field_name: '附页确认', type: 'select', options: ['待确认', '已确认'] },
    { field_name: '待确认需求', type: 'text', description: '需要客户确认的内容（如包装材料等）' },
    { field_name: '确认截止日期', type: 'date', description: '待确认需求的最终确认日期' },
    { field_name: '附件', type: 'file', description: '客户订单附件等' },
    { field_name: '备注', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
    { field_name: '最后更新日期', type: 'date', auto: 'updated_at' },
  ],
  views: [
    { view_name: '全部订单', filter: null, sort: [{ field: '创建日期', desc: true }] },
    { view_name: '待我评审', filter: { conditions: [{ field: '当前节点', operator: 'is', value: ['待提交'] }] } },
    { view_name: '急插单', filter: { conditions: [{ field: '是否急插单', operator: 'is', value: ['是'] }] } },
  ]
};

// ============================================================
// 表2：产品BOM表 (Product BOM)
// ============================================================
const PRODUCT_BOM_TABLE = {
  table_name: '产品BOM',
  table_key: 'product_bom',
  description: '产品物料清单，记录产品所需物料及用量',
  fields: [
    { field_name: '产品编码', type: 'text', primary: true },
    { field_name: '产品名称', type: 'text' },
    { field_name: '规格型号', type: 'text' },
    { field_name: '物料编码', type: 'text', description: '组成该产品的物料编码' },
    { field_name: '物料名称', type: 'text' },
    { field_name: '用量', type: 'number', description: '单位用量' },
    { field_name: '单位', type: 'select', options: ['PCS', 'M', 'KG', 'L', '个', '套', '卷', '盘'] },
    { field_name: '损耗率(%)', type: 'number', description: '标准损耗率' },
    { field_name: '工艺路线', type: 'text', description: '产品生产工艺流程' },
    { field_name: '版本', type: 'text', description: 'BOM版本号' },
    { field_name: '生效日期', type: 'date' },
    { field_name: '状态', type: 'select', options: ['草稿', '已生效', '已作废'] },
    { field_name: '创建人', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '全部BOM', filter: null },
    { view_name: '已生效BOM', filter: { conditions: [{ field: '状态', operator: 'is', value: ['已生效'] }] } },
  ]
};

// ============================================================
// 表3：物料表 (Material)
// ============================================================
const MATERIAL_TABLE = {
  table_name: '物料主档',
  table_key: 'material',
  description: '物料基础信息管理',
  fields: [
    { field_name: '物料编码', type: 'text', primary: true },
    { field_name: '物料名称', type: 'text' },
    { field_name: '规格型号', type: 'text' },
    { field_name: '物料分类', type: 'select', options: ['A类', 'B类', 'C类'],
      description: 'A类:10%种类占65%金额; B类:25%种类占25%金额; C类:65%种类占10%金额' },
    { field_name: '单位', type: 'select', options: ['PCS', 'M', 'KG', 'L', '个', '套', '卷', '盘'] },
    { field_name: '物料类型', type: 'select', options: ['原材料', '半成品', '成品', '包装材料', '辅料'] },
    { field_name: '库存数量', type: 'number', description: '当前可用库存' },
    { field_name: '安全库存', type: 'number' },
    { field_name: '最低库存', type: 'number' },
    { field_name: '最高库存', type: 'number' },
    { field_name: '仓库位置', type: 'text', description: '默认存放位置' },
    { field_name: '供应商', type: 'text' },
    { field_name: '单价', type: 'number', description: '最近采购单价' },
    { field_name: '状态', type: 'select', options: ['启用', '停用'] },
    { field_name: '备注', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '全部物料', filter: null },
    { view_name: 'ABC分类视图', filter: null },
    { view_name: '低库存预警', filter: { conditions: [{ field: '库存数量', operator: 'less_equal', value: ['安全库存'] }] } },
  ]
};

// ============================================================
// 表4：生产工单表 (Production Order)
// ============================================================
const PRODUCTION_ORDER_TABLE = {
  table_name: '生产工单',
  table_key: 'production_order',
  description: '生产工单，将销售订单需求转化为生产指令',
  fields: [
    { field_name: '工单编号', type: 'text', primary: true,
      description: '编号规则：MO+年月(4位)+流水号(4位)，如MO2026060001' },
    { field_name: '关联销售订单号', type: 'text', description: '触发该工单的销售订单编号' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '物料编码', type: 'text' },
    { field_name: '工单数量', type: 'number', description: '计划生产数量' },
    { field_name: '生产部门', type: 'select', options: ['注塑部', '丝印部', 'SMT车间', '装配车间', '包装车间'] },
    { field_name: '开工日期', type: 'date' },
    { field_name: '完工日期', type: 'date' },
    { field_name: '实际开工日期', type: 'date' },
    { field_name: '实际完工日期', type: 'date' },
    { field_name: '入库数量', type: 'number', description: '实际完成入库数量' },
    { field_name: '工单状态', type: 'select',
      options: ['待排程', '已排程', '已发料', '生产中', '已完成', '已结案', '已取消'] },
    { field_name: '备注', type: 'text' },
    { field_name: '创建人', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '全部工单', filter: null },
    { view_name: '待排程', filter: { conditions: [{ field: '工单状态', operator: 'is', value: ['待排程'] }] } },
    { view_name: '生产中', filter: { conditions: [{ field: '工单状态', operator: 'is', value: ['生产中'] }] } },
    { view_name: '已结案', filter: { conditions: [{ field: '工单状态', operator: 'is', value: ['已结案'] }] } },
  ]
};

// ============================================================
// 表5：生产排程表 (Production Schedule)
// ============================================================
const PRODUCTION_SCHEDULE_TABLE = {
  table_name: '生产排程',
  table_key: 'production_schedule',
  description: '生产排程明细，按工序落实各生产环节的日期安排',
  fields: [
    { field_name: '排程编号', type: 'text', primary: true },
    { field_name: '关联工单编号', type: 'text' },
    { field_name: '工序名称', type: 'select', options: ['注塑', '丝印', '贴片', '装配', '测试', '老化', '包装', 'OQC检验'] },
    { field_name: '计划日期', type: 'date' },
    { field_name: '计划数量', type: 'number' },
    { field_name: '实际数量', type: 'number' },
    { field_name: '标准产能/天', type: 'number' },
    { field_name: '完成率(%)', type: 'number', description: '实际数量/计划数量×100' },
    { field_name: '排程状态', type: 'select', options: ['待执行', '执行中', '已完成', '已暂停'] },
    { field_name: '备注', type: 'text' },
  ],
  views: [
    { view_name: '全部排程', filter: null },
    { view_name: '本周排程', filter: null },
  ]
};

// ============================================================
// 表6：每日生产计划 (Daily Production Plan)
// ============================================================
const DAILY_PLAN_TABLE = {
  table_name: '每日生产计划',
  table_key: 'daily_plan',
  description: '每日生产计划，需提前三天下发',
  fields: [
    { field_name: '计划编号', type: 'text', primary: true },
    { field_name: '生产日期', type: 'date', description: '计划执行的日期' },
    { field_name: '关联工单编号', type: 'text' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '计划数量', type: 'number' },
    { field_name: '生产车间', type: 'select', options: ['注塑部', '丝印部', 'SMT车间', '装配车间', '包装车间', '成品组装车间'] },
    { field_name: '是否欠料', type: 'select', options: ['否', '是'] },
    { field_name: '欠料到料时间', type: 'date', description: '欠料情况下的预计到料时间，原则上不超过一天' },
    { field_name: '样品生产情况', type: 'text', description: '成品组装车间需落实样品生产情况' },
    { field_name: '发放日期', type: 'date', description: '计划发放日期' },
    { field_name: '实际完成数量', type: 'number' },
    { field_name: '完成率(%)', type: 'number' },
    { field_name: '计划状态', type: 'select', options: ['未开始', '进行中', '已完成', '已调整'] },
    { field_name: '备注', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '今日计划', filter: { conditions: [{ field: '生产日期', operator: 'is', value: ['today'] }] } },
    { view_name: '本周计划', filter: null },
    { view_name: '欠料计划', filter: { conditions: [{ field: '是否欠料', operator: 'is', value: ['是'] }] } },
  ]
};

// ============================================================
// 表7：生产计划排程表(周) (Weekly Production Schedule)
// ============================================================
const WEEKLY_SCHEDULE_TABLE = {
  table_name: '周生产排程表',
  table_key: 'weekly_schedule',
  description: '每周生产计划排程表，次次周发放',
  fields: [
    { field_name: '排程编号', type: 'text', primary: true },
    { field_name: '周次', type: 'text', description: '如2026-W25' },
    { field_name: '销售单号', type: 'text' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '计划数量', type: 'number' },
    { field_name: '生产部门', type: 'select', options: ['注塑部', '丝印部', 'SMT车间', '装配车间', '包装车间'] },
    { field_name: '物料信息', type: 'text', description: 'MC主管填写的物料状况' },
    { field_name: '物料状态', type: 'select', options: ['正常', '欠料', '部分欠料'] },
    { field_name: '下发日期', type: 'date' },
    { field_name: '状态', type: 'select', options: ['待下发', '已下发', '已调整', '已完成'] },
    { field_name: '备注', type: 'text' },
  ],
  views: [
    { view_name: '当前周排程', filter: null },
    { view_name: '次次周排程', filter: null },
  ]
};

// ============================================================
// 表8：生产发料单 (Material Issue)
// ============================================================
const MATERIAL_ISSUE_TABLE = {
  table_name: '生产发料单',
  table_key: 'material_issue',
  description: '生产订单物料发放记录',
  fields: [
    { field_name: '发料单号', type: 'text', primary: true },
    { field_name: '关联工单编号', type: 'text' },
    { field_name: '物料编码', type: 'text' },
    { field_name: '物料名称', type: 'text' },
    { field_name: '应发数量', type: 'number' },
    { field_name: '实发数量', type: 'number' },
    { field_name: '欠料数量', type: 'number', description: '应发-实发' },
    { field_name: '发料类型', type: 'select', options: ['正常发料', '按可用量发料', '补料'] },
    { field_name: '领料人', type: 'text' },
    { field_name: '发料人', type: 'text' },
    { field_name: '发料日期', type: 'date' },
    { field_name: '发料状态', type: 'select', options: ['未发料', '已备料', '已交接', '已审核'] },
    { field_name: '交接签字', type: 'select', options: ['待签字', '已签字'] },
    { field_name: '备注', type: 'text' },
  ]
};

// ============================================================
// 表9：退补料申请单 (Material Return/Supplement Request)
// ============================================================
const MATERIAL_RETURN_REQ_TABLE = {
  table_name: '退补料申请单',
  table_key: 'material_return_req',
  description: '生产退料和补料的申请记录',
  fields: [
    { field_name: '单据编号', type: 'text', primary: true,
      description: '编号规则：小组代码-年月(6位)+流水号(4位)' },
    { field_name: '单据类型', type: 'select', options: ['退料', '补料'] },
    { field_name: '收发类别', type: 'select',
      options: ['制程退料', '来料不良退料', '生产退料', '制程补料', '来料不良补料', '生产领料'] },
    { field_name: '申请部门', type: 'select', options: ['注塑部', '丝印部', 'SMT车间', '装配车间', '包装车间'] },
    { field_name: '生产小组', type: 'text', description: '如4A1表示四A车间一组' },
    { field_name: '关联工单编号', type: 'text' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '订单数量', type: 'number' },
    { field_name: '物料编码', type: 'text' },
    { field_name: '退/补料数量', type: 'number' },
    { field_name: '退/补料比例(%)', type: 'number', description: '退/补料数量/订单数量×100' },
    { field_name: '原因说明', type: 'text' },
    { field_name: '审批状态', type: 'select',
      options: ['草稿', '组长审核', '主管复核', '品质确认', '物控加签', '经理审批', '副总审批', '总经理审批', '已完成'] },
    { field_name: '系统单据号', type: 'text', description: '云上ERP系统单据编号' },
    { field_name: '组长期审', type: 'select', options: ['待审', '通过', '驳回'] },
    { field_name: '主管复核', type: 'select', options: ['待审', '通过', '驳回'] },
    { field_name: '品质确认', type: 'select', options: ['待确认', '已确认'] },
    { field_name: '物控加签', type: 'select', options: ['不需要', '待审', '通过', '驳回'] },
    { field_name: '经理审批', type: 'select', options: ['不需要', '待审', '通过', '驳回'] },
    { field_name: '备注', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '待审批退料', filter: null },
    { view_name: '待审批补料', filter: null },
  ]
};

// ============================================================
// 表10：销售发货单 (Sales Shipment)
// ============================================================
const SALES_SHIPMENT_TABLE = {
  table_name: '销售发货单',
  table_key: 'sales_shipment',
  description: '销售发货记录，包括订单出货和库存型出货',
  fields: [
    { field_name: '发货单号', type: 'text', primary: true },
    { field_name: '关联销售订单号', type: 'text', description: '订单出货时必填' },
    { field_name: '客户名称', type: 'text' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '规格型号', type: 'text' },
    { field_name: '发货数量', type: 'number' },
    { field_name: '单价', type: 'number' },
    { field_name: '总金额', type: 'number' },
    { field_name: '批号', type: 'select', options: ['销售订单号', 'YSMIS'],
      description: 'YSMIS为库存型成品出货（公用库存）' },
    { field_name: '业务员', type: 'text' },
    { field_name: '部门审核', type: 'select', options: ['待审核', '已审核', '已驳回'] },
    { field_name: '财务审核', type: 'select', options: ['待审核', '已审核', '已驳回'] },
    { field_name: 'OQC确认', type: 'select', options: ['待确认', '已确认'] },
    { field_name: '发货日期', type: 'date' },
    { field_name: '是否已发货', type: 'select', options: ['未发货', '已备货', '已装柜', '已发货'] },
    { field_name: '尾数箱数量', type: 'number', description: '每批次只允许有一尾数箱' },
    { field_name: '放行条', type: 'select', options: ['未开具', '已开具'] },
    { field_name: '备注', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '待发货单', filter: { conditions: [{ field: '是否已发货', operator: 'is', value: ['未发货'] }] } },
    { view_name: '待审核发货单', filter: { conditions: [{ field: '财务审核', operator: 'is', value: ['待审核'] }] } },
    { view_name: '已发货', filter: { conditions: [{ field: '是否已发货', operator: 'is', value: ['已发货'] }] } },
  ]
};

// ============================================================
// 表11：预测需求计划 (Demand Forecast)
// ============================================================
const DEMAND_FORECAST_TABLE = {
  table_name: '预测需求计划',
  table_key: 'demand_forecast',
  description: '每月销售预测和需求计划',
  fields: [
    { field_name: '计划编号', type: 'text', primary: true },
    { field_name: '计划月份', type: 'date', description: '如2026-06' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '预测数量', type: 'number' },
    { field_name: '创建人', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
    { field_name: '状态', type: 'select', options: ['草案', '已确认', '已转化订单'] },
    { field_name: '备注', type: 'text' },
  ],
  views: [
    { view_name: '当前月预测', filter: null },
    { view_name: '下月预测', filter: null },
  ]
};

// ============================================================
// 表12：订单变更通知单 (Order Change Notice)
// ============================================================
const ORDER_CHANGE_NOTICE_TABLE = {
  table_name: '订单变更通知单',
  table_key: 'order_change_notice',
  description: '销售订单变更及通知管理',
  fields: [
    { field_name: '变更单号', type: 'text', primary: true },
    { field_name: '关联销售订单号', type: 'text' },
    { field_name: '变更类型', type: 'select', options: ['交期变更', '产品要求变更', '数量变更', '急插单调整', '其他'] },
    { field_name: '变更发起方', type: 'select', options: ['客户提出', '计划部提出', '业务部提出'] },
    { field_name: '变更原因', type: 'text' },
    { field_name: '变更前内容', type: 'text' },
    { field_name: '变更后内容', type: 'text' },
    { field_name: '评审状态', type: 'select', options: ['待评审', '评审中', '评审完成', '已确认变更', '已取消'] },
    { field_name: '发起人', type: 'text' },
    { field_name: '发起日期', type: 'date', auto: 'created_at' },
    { field_name: '备注', type: 'text' },
  ],
  views: [
    { view_name: '待处理变更', filter: { conditions: [{ field: '评审状态', operator: 'is', value: ['待评审'] }] } },
  ]
};

// ============================================================
// 表13：联络单 (Contact Note)
// ============================================================
const CONTACT_NOTE_TABLE = {
  table_name: '联络单',
  table_key: 'contact_note',
  description: '部门间非订单类需求的联络沟通记录',
  fields: [
    { field_name: '联络单号', type: 'text', primary: true },
    { field_name: '发起部门', type: 'select', options: ['国际业务部', '国内市场部', '计划部', '工程部', '采购部', '品质部', '生产部'] },
    { field_name: '接收部门', type: 'select', options: ['国际业务部', '国内市场部', '计划部', '工程部', '采购部', '品质部', '生产部'] },
    { field_name: '标题', type: 'text' },
    { field_name: '内容', type: 'text' },
    { field_name: '审批状态', type: 'select', options: ['待部门负责人审批', '已审批', '处理中', '已完成', '已驳回'] },
    { field_name: '发起人', type: 'text' },
    { field_name: '发起日期', type: 'date', auto: 'created_at' },
    { field_name: '完成日期', type: 'date' },
    { field_name: '备注', type: 'text' },
  ],
  views: [
    { view_name: '待处理联络单', filter: { conditions: [{ field: '审批状态', operator: 'is', value: ['待部门负责人审批'] }] } },
  ]
};

// ============================================================
// 表14：产品生产周期表 (Production Cycle)
// ============================================================
const PRODUCTION_CYCLE_TABLE = {
  table_name: '产品生产周期表',
  table_key: 'production_cycle',
  description: '产品标准生产周期定义，每半年更新一次',
  fields: [
    { field_name: '产品编码', type: 'text', primary: true },
    { field_name: '产品名称', type: 'text' },
    { field_name: '产品类别', type: 'select', options: ['标准产品', '非标准产品', '新产品'] },
    { field_name: '生产周期(天)', type: 'number', description: '从投料到完工的标准天数' },
    { field_name: '各环节周期', type: 'text', description: 'JSON格式存储各工序天数' },
    { field_name: '版本', type: 'text' },
    { field_name: '生效日期', type: 'date' },
    { field_name: '状态', type: 'select', options: ['草稿', '已生效', '已作废'] },
    { field_name: '审批人', type: 'text', description: '分管领导审批' },
    { field_name: '文控编号', type: 'text', description: '文控中心受控号' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '有效周期', filter: { conditions: [{ field: '状态', operator: 'is', value: ['已生效'] }] } },
  ]
};

// ============================================================
// 表15：KPI统计表 (KPI Statistics)
// ============================================================
const KPI_STATISTICS_TABLE = {
  table_name: 'KPI统计',
  table_key: 'kpi_statistics',
  description: '月度KPI数据统计',
  fields: [
    { field_name: '统计月份', type: 'text', primary: true, description: '如2026-06' },
    { field_name: '订单准时交付率(%)', type: 'number' },
    { field_name: '准时交付订单数', type: 'number' },
    { field_name: '总订单数', type: 'number' },
    { field_name: '延误订单数', type: 'number' },
    { field_name: '生产计划达成率(%)', type: 'number' },
    { field_name: '生产计划准确率(%)', type: 'number' },
    { field_name: '未达成分析', type: 'text', description: '对未达成原因的分析及改善措施' },
    { field_name: '改善措施', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ],
  views: [
    { view_name: '最近12个月', filter: null },
  ]
};

// ============================================================
// 表16：生产订单损耗统计表
// ============================================================
const WASTE_STATISTICS_TABLE = {
  table_name: '生产订单损耗统计表',
  table_key: 'waste_statistics',
  description: '生产订单损耗统计，每月统计报总经办和财务',
  fields: [
    { field_name: '统计月份', type: 'text', primary: true, description: '如2026-06' },
    { field_name: '生产工单号', type: 'text' },
    { field_name: '产品编码', type: 'text' },
    { field_name: '产品名称', type: 'text' },
    { field_name: '订单数量', type: 'number' },
    { field_name: '损耗数量', type: 'number' },
    { field_name: '损耗比例(%)', type: 'number' },
    { field_name: '超损比例(%)', type: 'number', description: '超过标准损耗的部分' },
    { field_name: '责任部门', type: 'text' },
    { field_name: '原因分析', type: 'text' },
    { field_name: '预防措施', type: 'text' },
    { field_name: '创建日期', type: 'date', auto: 'created_at' },
  ]
};

// ============================================================
//  导出所有表定义
// ============================================================
module.exports = {
  SALES_ORDER_TABLE,
  PRODUCT_BOM_TABLE,
  MATERIAL_TABLE,
  PRODUCTION_ORDER_TABLE,
  PRODUCTION_SCHEDULE_TABLE,
  DAILY_PLAN_TABLE,
  WEEKLY_SCHEDULE_TABLE,
  MATERIAL_ISSUE_TABLE,
  MATERIAL_RETURN_REQ_TABLE,
  SALES_SHIPMENT_TABLE,
  DEMAND_FORECAST_TABLE,
  ORDER_CHANGE_NOTICE_TABLE,
  CONTACT_NOTE_TABLE,
  PRODUCTION_CYCLE_TABLE,
  KPI_STATISTICS_TABLE,
  WASTE_STATISTICS_TABLE,
};
