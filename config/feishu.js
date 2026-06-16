/**
 * 飞书SDK配置
 * 初始化飞书客户端，提供统一的API调用入口
 */
const { Client } = require('@larksuiteoapi/node-sdk');
require('dotenv').config();

// 创建飞书客户端实例
const client = new Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  domain: 'https://open.feishu.cn', // 国内版用 https://open.feishu.cn，国际版用 https://open.larksuite.com
});

// 多维表格应用令牌
const BITABLE_APP_TOKEN = process.env.BITABLE_APP_TOKEN;

module.exports = {
  client,
  BITABLE_APP_TOKEN,
};
