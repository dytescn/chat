// src/apis/prompts.ts
// 预设表 CRUD，完全自包含

const API_URL = "http://127.0.0.1:44944/database";
const DIALOGUE_DB = "./dialogue";

// ---------- 基础数据库操作 ----------
const dbFetch = async (symbol: string, body: any) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/libary',
      'FFI-Symbol': symbol,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const dbQuery = async (sql: string, path: string = DIALOGUE_DB) => {
  const raw = await dbFetch('db_query', { path, sql });
  if (raw?.data && Array.isArray(raw.data)) {
    return raw.data;
  }
  return raw;
};

const dbInsert = (sql: string, path: string = DIALOGUE_DB) => {
  return dbFetch('db_insert', { path, sql });
};

const dbUpdate = (sql: string, path: string = DIALOGUE_DB) => {
  return dbFetch('db_update', { path, sql });
};

const dbDelete = (sql: string, path: string = DIALOGUE_DB) => {
  return dbFetch('db_delete', { path, sql });
};

// ========== Prompts CRUD ==========

// 创建预设
export const createPrompt = async (data: {
  title: string;
  content: string;
  category?: string;
  is_system?: boolean;
}) => {
  const sql = `
    INSERT INTO prompts (title, content, category, is_system)
    VALUES (
      '${data.title}',
      '${data.content.replace(/'/g, "''")}',
      '${data.category || 'General'}',
      ${data.is_system ? 1 : 0}
    )
  `;
  return await dbInsert(sql);
};

// 获取预设列表（可按分类过滤）
export const getPrompts = async (category?: string) => {
  let sql = 'SELECT * FROM prompts';
  if (category) sql += ` WHERE category = '${category}'`;
  sql += ' ORDER BY is_system DESC, title';
  return await dbQuery(sql);
};

// 删除预设
export const deletePrompt = async (id: number) => {
  const sql = `DELETE FROM prompts WHERE id = ${id}`;
  return await dbDelete(sql);
};