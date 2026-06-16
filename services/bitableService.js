/**
 * 飞书多维表格(Bitable)通用服务
 * 封装对飞书多维表格的CRUD操作
 */

const { client, BITABLE_APP_TOKEN } = require('../config/feishu');
const { resolveKey } = require('./tableMapper');

class BitableService {
  constructor() {
    this.appToken = BITABLE_APP_TOKEN;
    this.appTableRecord = client.bitable.appTableRecord;
  }

  /**
   * 自动解析表名。若传的是key如'sales_order'，自动转成实际table_id
   */
  _tid(key) {
    if (!key || key.startsWith('tbl')) return key;
    return resolveKey(key);
  }

  /**
   * 获取所有记录（支持分页）
   */
  async listRecords(tableKey, params = {}) {
    const tableId = this._tid(tableKey);
    try {
      const resp = await this.appTableRecord.list({
        path: { app_token: this.appToken, table_id: tableId },
        query: {
          page_size: params.pageSize || 500,
          page_token: params.pageToken || '',
          field_names: params.fields || [],
          sort: params.sort || [],
          filter: params.filter || '',
        },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable listRecords 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 根据ID获取单条记录
   */
  async getRecord(tableKey, recordId) {
    const tableId = this._tid(tableKey);
    try {
      const resp = await this.appTableRecord.get({
        path: { app_token: this.appToken, table_id: tableId, record_id: recordId },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable getRecord 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 创建记录
   */
  async createRecord(tableKey, fields) {
    const tableId = this._tid(tableKey);
    try {
      const resp = await this.appTableRecord.create({
        path: { app_token: this.appToken, table_id: tableId },
        data: {
          fields: this.formatFields(fields),
        },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable createRecord 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 批量创建记录
   */
  async batchCreateRecords(tableKey, records) {
    const tableId = this._tid(tableKey);
    try {
      const resp = await this.appTableRecord.batchCreate({
        path: { app_token: this.appToken, table_id: tableId },
        data: {
          records: records.map(r => ({ fields: this.formatFields(r) })),
        },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable batchCreateRecords 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 更新单条记录
   */
  async updateRecord(tableKey, recordId, fields) {
    const tableId = this._tid(tableKey);
    try {
      const resp = await this.appTableRecord.update({
        path: { app_token: this.appToken, table_id: tableId, record_id: recordId },
        data: {
          fields: this.formatFields(fields),
        },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable updateRecord 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 批量更新记录
   */
  async batchUpdateRecords(tableKey, records) {
    const tableId = this._tid(tableKey);
    try {
      const recordsData = records.map(r => ({
        record_id: r.record_id,
        fields: this.formatFields(r.fields),
      }));
      const resp = await this.appTableRecord.batchUpdate({
        path: { app_token: this.appToken, table_id: tableId },
        data: { records: recordsData },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable batchUpdateRecords 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(tableKey, recordId) {
    const tableId = this._tid(tableKey);
    try {
      const resp = await this.appTableRecord.delete({
        path: { app_token: this.appToken, table_id: tableId, record_id: recordId },
      });
      return resp.data;
    } catch (err) {
      console.error(`Bitable deleteRecord 错误:`, err.message);
      throw err;
    }
  }

  /**
   * 格式化字段数据（处理数组、日期等类型）
   * 飞书API要求：日期必须传Unix时间戳（毫秒）
   */
  formatFields(fields) {
    const formatted = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined) continue;

      // Date 对象 → 时间戳
      if (value instanceof Date) {
        formatted[key] = value.getTime();
        continue;
      }

      // 日期字符串 '2026-06-16' 或 '2026-06-16T...' → 时间戳
      if (typeof value === 'string' && /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(value)) {
        const ts = new Date(value).getTime();
        if (!isNaN(ts)) {
          formatted[key] = ts;
          continue;
        }
      }

      // 对象（非数组）→ JSON字符串
      if (typeof value === 'object' && !Array.isArray(value)) {
        formatted[key] = JSON.stringify(value);
        continue;
      }

      formatted[key] = value;
    }
    return formatted;
  }
}

module.exports = new BitableService();
