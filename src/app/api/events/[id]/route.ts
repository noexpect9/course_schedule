// app/api/users/[id]/route.ts

import { pool } from '../../../../../lib/db'; // 注意路径多了一层
import { NextResponse } from 'next/server';

interface RequestContext {
  params: {
    id: string; // id 会从 URL 中作为字符串传入
  };
}

// PUT /api/users/:id - 更新指定ID的数据
export async function PUT(request: Request, { params }: RequestContext) {
  try {
    const { id } = params; // 从 URL 参数获取 id
    const { title, date, endDate, color } = await request.json(); // 从请求体获取要更新的数据

    if (!title || !date || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await pool.execute(
      'UPDATE sys_class SET title = ?, start_date = ?, end_date = ?, color = ? WHERE id = ?',
      [title, new Date(date), new Date(endDate), color, id]
    );

    // 检查是否有行被更新
    if ((result[0] as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event updated successfully' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/users/:id - 删除指定ID的数据
export async function DELETE(request: Request, { params }: RequestContext) {
  try {
    const { id } = params; // 从 URL 参数获取 id

    const result = await pool.execute(
      'DELETE FROM sys_class WHERE id = ?',
      [id]
    );

    if ((result[0] as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 返回 204 No Content，表示成功删除，且响应体为空
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}