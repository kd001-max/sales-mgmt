/**
 * 飞书机器人消息服务
 * 用于发送系统通知和待办提醒到飞书群
 */

const axios = require('axios');

class BotService {
  constructor() {
    this.webhookUrl = process.env.BOT_WEBHOOK_URL;
  }

  /**
   * 发送文本消息到飞书群
   */
  async sendTextMessage(text, title = '📢 销售生产系统通知') {
    if (!this.webhookUrl) {
      console.warn('Bot Webhook 未配置，跳过消息发送');
      return;
    }
    try {
      await axios.post(this.webhookUrl, {
        msg_type: 'interactive',
        card: {
          header: {
            title: { tag: 'plain_text', content: title },
          },
          elements: [
            { tag: 'markdown', content: text },
          ],
        },
      });
    } catch (err) {
      console.error('发送飞书消息失败:', err.message);
    }
  }

  /**
   * 发送订单评审提醒
   */
  async notifyOrderReview(orderNo, customer, reviewer) {
    const msg = `**📋 订单评审提醒**\n`
      + `- 订单编号：${orderNo}\n`
      + `- 客户名称：${customer}\n`
      + `- 请 **${reviewer}** 尽快完成评审\n`
      + `- 点击下方链接查看详情：`;
    await this.sendTextMessage(msg, '📋 销售订单待评审');
  }

  /**
   * 发送生产计划变更通知
   */
  async notifyPlanChange(planNo, reason) {
    const msg = `**⚠️ 生产计划变更通知**\n`
      + `- 计划编号：${planNo}\n`
      + `- 变更原因：${reason}\n`
      + `- 请相关部门及时查看调整后的计划。`;
    await this.sendTextMessage(msg, '⚠️ 生产计划变更');
  }

  /**
   * 发送物料欠料预警
   */
  async notifyMaterialShortage(materialCode, materialName, shortageQty) {
    const msg = `**🚨 物料欠料预警**\n`
      + `- 物料编码：${materialCode}\n`
      + `- 物料名称：${materialName}\n`
      + `- 欠料数量：${shortageQty}\n`
      + `- 请采购部及时跟催！`;
    await this.sendTextMessage(msg, '🚨 物料欠料预警');
  }

  /**
   * 发送发货通知
   */
  async notifyShipment(shipmentNo, customer, products) {
    const msg = `**🚚 销售发货通知**\n`
      + `- 发货单号：${shipmentNo}\n`
      + `- 客户名称：${customer}\n`
      + `- 发货产品：${products}\n`
      + `- 请仓库及时备货！`;
    await this.sendTextMessage(msg, '🚚 销售发货通知');
  }

  /**
   * 发送每日生产计划到车间
   */
  async notifyDailyPlan(date, plans) {
    let msg = `**📅 今日生产计划 (${date})**\n\n`;
    plans.forEach((p, i) => {
      msg += `${i + 1}. ${p.workshop} - ${p.product} x ${p.qty}\n`;
    });
    await this.sendTextMessage(msg, '📅 每日生产计划');
  }

  /**
   * 发送KPI统计报告
   */
  async notifyKPIReport(month, data) {
    const msg = `**📊 ${month} KPI统计报告**\n\n`
      + `- 订单准时交付率：${data.deliveryRate}%\n`
      + `- 生产计划达成率：${data.planRate}%\n`
      + `- 生产计划准确率：${data.accuracyRate}%\n\n`
      + `详情请查看系统数据。`;
    await this.sendTextMessage(msg, '📊 KPI月度统计');
  }
}

module.exports = new BotService();
