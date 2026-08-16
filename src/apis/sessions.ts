// src/apis/sessions.ts
// 会话表 CRUD，完全自包含

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
  // 统一返回空数组，避免调用方需要额外判断
  return [];
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

// ========== Sessions CRUD ==========

// 创建会话
export const createSession = async (data: {
  id: string;
  title: string;
  model_name: string;
  system_prompt?: string;
  model_config?: any;
}) => {
  const sql = `
    INSERT INTO sessions (id, title, model_name, system_prompt, model_config)
    VALUES (
      '${data.id}',
      '${data.title}',
      '${data.model_name}',
      '${data.system_prompt || ''}',
      '${JSON.stringify(data.model_config || {})}'
    )
  `;
  return await dbInsert(sql);
};

// 获取会话列表（按置顶、更新时间倒序），默认每次返回 15 条
export const getSessions = async (archived: boolean = false, limit: number = 15, offset: number = 0) => {
  const where = archived ? "is_archived = 1" : "is_archived = 0";
  const sql = `SELECT * FROM sessions WHERE ${where} ORDER BY is_pinned DESC, updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return await dbQuery(sql);
};

// 按 ID 查询单个会话
export const getSessionById = async (id: string) => {
  const rows = await dbQuery(`SELECT * FROM sessions WHERE id = '${id}'`);
  return rows?.[0] || null;
};

// 更新会话
export const updateSession = async (id: string, updates: {
  title?: string;
  model_name?: string;
  system_prompt?: string;
  model_config?: any;
  is_pinned?: boolean;
  is_archived?: boolean;
}) => {
  const fields: string[] = [];
  if (updates.title !== undefined) fields.push(`title = '${updates.title}'`);
  if (updates.model_name !== undefined) fields.push(`model_name = '${updates.model_name}'`);
  if (updates.system_prompt !== undefined) fields.push(`system_prompt = '${updates.system_prompt}'`);
  if (updates.model_config !== undefined) fields.push(`model_config = '${JSON.stringify(updates.model_config)}'`);
  if (updates.is_pinned !== undefined) fields.push(`is_pinned = ${updates.is_pinned ? 1 : 0}`);
  if (updates.is_archived !== undefined) fields.push(`is_archived = ${updates.is_archived ? 1 : 0}`);
  if (fields.length === 0) throw new Error('No fields to update');
  fields.push(`updated_at = datetime('now')`);
  const sql = `UPDATE sessions SET ${fields.join(', ')} WHERE id = '${id}'`;
  return await dbUpdate(sql);
};

// 删除会话（级联删除所有消息和附件）
export const deleteSession = async (id: string) => {
  const sql = `DELETE FROM sessions WHERE id = '${id}'`;
  return await dbDelete(sql);
};