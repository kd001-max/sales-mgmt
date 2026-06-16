/**
 * ============================================================
 *  飞书多维表格(Bitable)初始化脚本
 *  运行此脚本可在飞书上创建所有数据表及视图
 * ============================================================
 *
 * 使用方法：
 * 1. 先在飞书开放平台创建应用，获取 AppID 和 AppSecret
 * 2. 在飞书多维表格中新建一个「销售生产管理系统」多维表格
 * 3. 获取该多维表格的 app_token
 * 4. 配置 .env 文件中的 FEISHU_APP_ID、FEISHU_APP_SECRET、BITABLE_APP_TOKEN
 * 5. 运行: npm run init-bitable
 */

const { client, BITABLE_APP_TOKEN } = require('../config/feishu');
const fs = require('fs');
const path = require('path');

// 导入所有表定义
const tables = require('./schema');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 初始化所有数据表（在飞书多维表格中创建字段和视图）
 */
async function initAllTables() {
  console.log('========================================');
  console.log('  销售生产管理系统 - 飞书Bitable初始化');
  console.log('========================================\n');

  if (!BITABLE_APP_TOKEN) {
    console.error('❌ 错误: 请在.env中配置 BITABLE_APP_TOKEN');
    process.exit(1);
  }

  console.log(`📋 使用多维表格: ${BITABLE_APP_TOKEN}\n`);

  const tableEntries = Object.entries(tables);

  for (const [key, tableDef] of tableEntries) {
    console.log(`\n--- 正在处理: ${tableDef.table_name} (${key}) ---`);

    try {
      // 1. 检查表是否已存在
      let tableId = null;
      try {
        const listResp = await client.bitable.appTable.list({
          path: { app_token: BITABLE_APP_TOKEN },
        });

        if (listResp.data && listResp.data.items) {
          const existing = listResp.data.items.find(t => t.name === tableDef.table_name);
          if (existing) {
            tableId = existing.table_id;
            console.log(`  ✅ 表已存在: ${tableDef.table_name} (ID: ${tableId})`);
          }
        }
      } catch (err) {
        console.log(`  检查表是否存在时出错: ${err.message}`);
      }

      // 2. 创建表（如果不存在）
      if (!tableId) {
        const createResp = await client.bitable.appTable.create({
          path: { app_token: BITABLE_APP_TOKEN },
          data: {
            table: { name: tableDef.table_name },
          },
        });
        // SDK返回: { code: 0, data: { table_id: 'xxx' }, msg: 'success' }
        tableId = createResp.data?.table_id;
        console.log(`  ✅ 表已创建: ${tableDef.table_name} (ID: ${tableId})`);
        await sleep(500);
      }

      // 3. 创建/更新字段
      if (tableDef.fields && tableDef.fields.length > 0) {
        // 先获取现有字段
        let existingFields = [];
        try {
          const fieldResp = await client.bitable.appTableField.list({
            path: { app_token: BITABLE_APP_TOKEN, table_id: tableId },
          });
          if (fieldResp.data && fieldResp.data.items) {
            existingFields = fieldResp.data.items.map(f => f.field_name);
          }
        } catch (err) {
          console.log(`  获取现有字段时出错: ${err.message}`);
        }

        for (const field of tableDef.fields) {
          try {
            if (!existingFields.includes(field.field_name)) {
              const fieldType = mapFieldType(field.type, field);
              // 跳过不支持自动创建的字段类型
              if (fieldType === -1) {
                console.log(`  ⏭️  跳过字段: ${field.field_name} (不支持API创建)`);
                continue;
              }
              const fieldConfig = buildFieldConfig(field);
              await client.bitable.appTableField.create({
                path: { app_token: BITABLE_APP_TOKEN, table_id: tableId },
                data: {
                  field_name: field.field_name,
                  type: fieldType,
                  property: fieldConfig,
                },
              });
              console.log(`  ✅ 创建字段: ${field.field_name} (${field.type})`);
              await sleep(200);
            } else {
              console.log(`  ⏭️  字段已存在: ${field.field_name}`);
            }
          } catch (err) {
            console.log(`  ❌ 创建字段失败: ${field.field_name} - ${err.message}`);
          }
        }
      }

      // 4. 创建视图
      if (tableDef.views && tableDef.views.length > 0) {
        let existingViews = [];
        try {
          const viewResp = await client.bitable.appTableView.list({
            path: { app_token: BITABLE_APP_TOKEN, table_id: tableId },
          });
          if (viewResp.data && viewResp.data.items) {
            existingViews = viewResp.data.items.map(v => v.view_name);
          }
        } catch (err) {
          console.log(`  获取现有视图时出错: ${err.message}`);
        }

        for (const view of tableDef.views) {
          if (!existingViews.includes(view.view_name)) {
            try {
              await client.bitable.appTableView.create({
                path: { app_token: BITABLE_APP_TOKEN, table_id: tableId },
                data: {
                  view_name: view.view_name,
                  view_type: 'grid',
                },
              });
              console.log(`  ✅ 创建视图: ${view.view_name}`);
              await sleep(200);
            } catch (err) {
              console.log(`  ❌ 创建视图失败: ${view.view_name} - ${err.message}`);
            }
          }
        }
      }

      // 生成Schema文档
      saveSchemaDoc(tableDef);

    } catch (err) {
      console.error(`  ❌ 处理表 ${tableDef.table_name} 失败:`, err.message);
    }
  }

  console.log('\n========================================');
  console.log('  ✅ 所有表初始化完成！');
  console.log('========================================');
  console.log('\n📖 请在飞书中打开多维表格查看已创建的数据表结构。');
  console.log('📝 运行以下命令启动Web应用: npm start\n');
}

/**
 * 映射字段类型到飞书API的字段类型
 */
function mapFieldType(type, field) {
  const typeMap = {
    'text': 1, 'number': 2, 'select': 3, 'multi_select': 4,
    'date': 5, 'file': 17, 'checkbox': 7, 'url': 15,
    'email': 8, 'phone': 9, 'location': 12, 'created_user': 11,
    'created_at': 1001, 'updated_at': 1002,
  };
  // 飞书API不支持创建file(附件)和auto时间字段，跳过创建
  if (type === 'file' || field.auto) return -1;
  return typeMap[type] || 1;
}

/**
 * 构建字段配置属性（用于select等类型）
 */
function buildFieldConfig(field) {
  const config = {};
  if (field.type === 'select' && field.options) {
    config.options = field.options.map(opt => ({ name: opt, color: 0 }));
  }
  if (field.auto === 'created_at') {
    config.auto_serial = { type: 'auto_increment' };
  }
  return config;
}

/**
 * 保存Schema文档到文件
 */
function saveSchemaDoc(tableDef) {
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  const mdPath = path.join(docsDir, `${tableDef.table_key}_schema.md`);
  let md = `# ${tableDef.table_name} 数据表定义\n\n`;
  md += `**表名**: \`${tableDef.table_key}\`\n\n`;
  md += `**说明**: ${tableDef.description || ''}\n\n`;
  md += `## 字段列表\n\n`;
  md += `| 字段名 | 类型 | 说明 |\n`;
  md += `|--------|------|------|\n`;
  for (const field of tableDef.fields) {
    const extra = field.options ? `(${field.options.join('/')})` : '';
    md += `| ${field.field_name} | ${field.type} ${extra} | ${field.description || ''} |\n`;
  }
  if (tableDef.views && tableDef.views.length > 0) {
    md += `\n## 视图列表\n\n`;
    for (const view of tableDef.views) {
      md += `- ${view.view_name}\n`;
    }
  }
  fs.writeFileSync(mdPath, md, 'utf-8');
  console.log(`  📄 文档已保存: docs/${tableDef.table_key}_schema.md`);
}

initAllTables().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
