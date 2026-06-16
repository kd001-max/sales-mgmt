/**
 * 飞书审批流服务
 * 用于创建和审批飞书审批实例
 */

const { client } = require('../config/feishu');

class ApprovalService {
  constructor() {
    // 审批定义编码（从.env读取）
    this.approvalCodes = {
      SALES_ORDER: process.env.APPROVAL_CODE_SALES_ORDER,
      ORDER_CHANGE: process.env.APPROVAL_CODE_ORDER_CHANGE,
      MATERIAL_RETURN: process.env.APPROVAL_CODE_MATERIAL_RETURN,
      CONTACT_NOTE: process.env.APPROVAL_CODE_CONTACT_NOTE,
    };
  }

  /**
   * 创建销售订单评审审批实例
   */
  async createSalesOrderApproval(orderData) {
    try {
      const resp = await client.approval.instance.create({
        data: {
          approval_code: this.approvalCodes.SALES_ORDER,
          user_id: orderData.userId,
          form: {
            form_data: [
              { id: 'orderNo', name: '订单编号', value: orderData.orderNo },
              { id: 'customer', name: '客户名称', value: orderData.customer },
              { id: 'amount', name: '订单金额', value: String(orderData.amount) },
              { id: 'deliveryDate', name: '要求交期', value: orderData.deliveryDate },
              { id: 'orderType', name: '订单类型', value: orderData.orderType },
            ],
          },
          title: `销售订单评审 - ${orderData.orderNo}`,
        },
      });
      return resp.data;
    } catch (err) {
      console.error('创建审批失败:', err.message);
      throw err;
    }
  }

  /**
   * 创建订单变更审批
   */
  async createOrderChangeApproval(changeData) {
    try {
      const resp = await client.approval.instance.create({
        data: {
          approval_code: this.approvalCodes.ORDER_CHANGE,
          user_id: changeData.userId,
          form: {
            form_data: [
              { id: 'changeNo', name: '变更单号', value: changeData.changeNo },
              { id: 'orderNo', name: '关联订单', value: changeData.orderNo },
              { id: 'changeType', name: '变更类型', value: changeData.changeType },
              { id: 'reason', name: '变更原因', value: changeData.reason },
            ],
          },
          title: `订单变更申请 - ${changeData.changeNo}`,
        },
      });
      return resp.data;
    } catch (err) {
      console.error('创建订单变更审批失败:', err.message);
      throw err;
    }
  }

  /**
   * 创建退补料审批
   */
  async createMaterialReturnApproval(reqData) {
    try {
      const resp = await client.approval.instance.create({
        data: {
          approval_code: this.approvalCodes.MATERIAL_RETURN,
          user_id: reqData.userId,
          form: {
            form_data: [
              { id: 'docNo', name: '单据编号', value: reqData.docNo },
              { id: 'docType', name: '单据类型', value: reqData.docType },
              { id: 'materialCode', name: '物料编码', value: reqData.materialCode },
              { id: 'quantity', name: '数量', value: String(reqData.quantity) },
              { id: 'ratio', name: '比例', value: `${reqData.ratio}%` },
            ],
          },
          title: `退补料申请 - ${reqData.docNo} (${reqData.docType})`,
        },
      });
      return resp.data;
    } catch (err) {
      console.error('创建退补料审批失败:', err.message);
      throw err;
    }
  }

  /**
   * 创建联络单审批
   */
  async createContactNoteApproval(noteData) {
    try {
      const resp = await client.approval.instance.create({
        data: {
          approval_code: this.approvalCodes.CONTACT_NOTE,
          user_id: noteData.userId,
          form: {
            form_data: [
              { id: 'noteNo', name: '联络单号', value: noteData.noteNo },
              { id: 'title', name: '标题', value: noteData.title },
              { id: 'content', name: '内容', value: noteData.content },
              { id: 'dept', name: '发起部门', value: noteData.department },
            ],
          },
          title: `联络单 - ${noteData.title}`,
        },
      });
      return resp.data;
    } catch (err) {
      console.error('创建联络单审批失败:', err.message);
      throw err;
    }
  }

  /**
   * 查询审批实例状态
   */
  async getApprovalStatus(instanceId) {
    try {
      const resp = await client.approval.instance.get({
        path: {
          instance_id: instanceId,
        },
      });
      return resp.data;
    } catch (err) {
      console.error('查询审批状态失败:', err.message);
      throw err;
    }
  }
}

module.exports = new ApprovalService();
