/**
 * 定时任务调度服务
 * 支持系统自动化任务，如每日计划提醒、KPI统计等
 */

const cron = require('node-cron');
const botService = require('./botService');
const bitableService = require('./bitableService');

class ScheduleService {

  /**
   * 启动所有定时任务
   */
  startAll() {
    console.log('🕐 启动定时任务调度...');

    // 每天早上9:00发送当日生产计划提醒
    cron.schedule('0 9 * * *', async () => {
      console.log('执行每日生产计划提醒...');
      try {
        const today = new Date().toISOString().split('T')[0];
        // 从飞书Bitable获取当日计划
        const plans = await this.getTodayPlans(today);
        if (plans && plans.length > 0) {
          await botService.notifyDailyPlan(today, plans);
        }
      } catch (err) {
        console.error('每日计划提醒失败:', err.message);
      }
    }, { timezone: 'Asia/Shanghai' });

    // 每周五下午5:00提醒发放次次周计划
    cron.schedule('0 17 * * 5', async () => {
      console.log('执行次次周计划发放提醒...');
      try {
        await botService.sendTextMessage(
          '📅 **周计划发放提醒**\n\n'
          + '请PC主管确认次次周的生产计划排程表已输出，\n'
          + '并经审核后发放至MC主管。',
          '📅 周计划发放提醒'
        );
      } catch (err) {
        console.error('周计划提醒失败:', err.message);
      }
    }, { timezone: 'Asia/Shanghai' });

    // 每月5号上午9:00提醒统计上月KPI
    cron.schedule('0 9 5 * *', async () => {
      console.log('执行KPI统计提醒...');
      try {
        await botService.sendTextMessage(
          '📊 **KPI统计提醒**\n\n'
          + '请安排专人统计上一个月订单准时交付率，\n'
          + '并将数据提交给计划部进行分析改善。',
          '📊 KPI月度统计提醒'
        );
      } catch (err) {
        console.error('KPI统计提醒失败:', err.message);
      }
    }, { timezone: 'Asia/Shanghai' });

    // 每月25号上午10:00提醒召开销售预测会议
    cron.schedule('0 10 25 * *', async () => {
      console.log('执行销售预测会议提醒...');
      try {
        await botService.sendTextMessage(
          '📈 **销售预测会议提醒**\n\n'
          + '请国际业务部、国内市场部与计划部\n'
          + '组织本月销售分析及下月产品预测会议，\n'
          + '形成预测销售订单并录入系统。',
          '📈 销售预测会议提醒'
        );
      } catch (err) {
        console.error('预测会议提醒失败:', err.message);
      }
    }, { timezone: 'Asia/Shanghai' });

    // 每天早上10:00生管巡线提醒
    cron.schedule('0 10 * * *', async () => {
      console.log('生管巡线提醒...');
      try {
        await botService.sendTextMessage(
          '🔍 **生管巡线提醒**\n\n'
          + '生管请于9时到各车间巡视，跟进昨日生产计划达成情况，\n'
          + '并落实今日计划执行情况。',
          '🔍 生管巡线提醒'
        );
      } catch (err) {
        console.error('巡线提醒失败:', err.message);
      }
    }, { timezone: 'Asia/Shanghai' });

    console.log('✅ 所有定时任务已启动');
  }

  /**
   * 获取今日生产计划
   */
  async getTodayPlans(today) {
    try {
      // 从每日生产计划表获取数据
      const records = await bitableService.listRecords('daily_plan_table_id', {
        filter: `CurrentValue.[生产日期] = DateTime(${new Date(today).getTime()})`,
      });
      if (records && records.items) {
        return records.items.map(item => ({
          workshop: item.fields['生产车间'],
          product: item.fields['产品名称'],
          qty: item.fields['计划数量'],
        }));
      }
      return [];
    } catch (err) {
      console.error('获取今日计划失败:', err.message);
      return [];
    }
  }
}

module.exports = new ScheduleService();
