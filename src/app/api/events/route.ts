// app/api/users/route.ts

import { pool } from '../../../../lib/db';
import { NextResponse } from 'next/server';

// GET /api/users - 获取所有数据
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_class ORDER BY start_date ASC');
    // 注意：我将响应的 key 从 { data: rows } 改为了 { rows }，以匹配前端的期望
    return NextResponse.json({  data: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/users - 创建新数据
export async function POST(request: Request) {
  try {
    // 使用 `date` 来匹配前端发送的 payload
    const { title, date, endDate, color } = await request.json();

    if (!title || !date || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEvent = {
      id: Date.now(), // 在代码中生成唯一的 ID
      title,
      start_date: new Date(date), // 将 ISO 字符串转换为数据库兼容的格式
      end_date: new Date(endDate),
      color,
    };

    await pool.execute(
      'INSERT INTO sys_class (id, title, start_date, end_date, color) VALUES (?, ?, ?, ?, ?)',
      [newEvent.id, newEvent.title, newEvent.start_date, newEvent.end_date, newEvent.color]
    );

    // 返回 201 Created 状态码和新创建的对象
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}