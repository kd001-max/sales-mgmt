require('dotenv').config();
const bitableService = require('./services/bitableService');

async function test() {
  console.log('=== 通过bitableService创建记录 ===\n');

  try {
    const result = await bitableService.createRecord('sales_order', {
      '订单编号': 'SO' + Date.now(),
      '客户名称': '测试客户',
      '业务员': '系统测试',
      '订单类型': '标准订单',
      '订单数量': 100,
      '单价': 50,
      '总金额': 5000,
      '交期日期': new Date().toISOString().split('T')[0],
      '当前节点': '待提交',
      '销售部门': '国内市场部',
    });

    console.log('✅ 成功!');
    console.log(JSON.stringify(result, null, 2).substring(0, 500));
  } catch (e) {
    console.log('❌ 失败:', e.message);
    if (e.response && e.response.data) console.log('响应:', JSON.stringify(e.response.data));
  }
}
test();
