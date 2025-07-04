// src/app/api/events/[id]/route.ts (or users/[id]/route.ts)

import { pool } from '../../../../../lib/db';
import { NextResponse, NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';


// GET /api/events/:id - 获取单个事件
export async function GET(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM sys_class WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


// PUT /api/events/:id - 更新一个事件
export async function PUT(request: NextRequest, { params }: any) {
  try {
    const { id } = params; // 从 URL 参数获取 id
    const { title, date, endDate, color } = await request.json();

    if (!title || !date || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const result = await pool.execute(
      'UPDATE sys_class SET title = ?, start_date = ?, end_date = ?, color = ? WHERE id = ?',
      [title, new Date(date), new Date(endDate), color, id]
    );

    if ((result[0] as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Event not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/events/:id - 删除一个事件
export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { id } = params; // 从 URL 参数获取 id

    const result = await pool.execute(
      'DELETE FROM sys_class WHERE id = ?',
      [id]
    );

    if ((result[0] as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}