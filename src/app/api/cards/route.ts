import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Retrieve all cards ordered by position ascending
export async function GET() {
  try {
    const { rows } = await query(
      'SELECT id, title, status, position, created_at, updated_at FROM cards ORDER BY position ASC'
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// POST: Add a new card
export async function POST(req: NextRequest) {
  try {
    const { title, status } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const cardStatus = status || 'todo';

    // Calculate position for the new card: place at the bottom of the target column
    const { rows: maxRows } = await query(
      'SELECT MAX(position) as max_pos FROM cards WHERE status = $1',
      [cardStatus]
    );

    const maxPos = maxRows[0]?.max_pos;
    const position = maxPos !== null && maxPos !== undefined ? maxPos + 1000.0 : 1000.0;

    const { rows } = await query(
      'INSERT INTO cards (title, status, position, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [title, cardStatus, position]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating card:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// PATCH: Update a card (title, status, or position)
export async function PATCH(req: NextRequest) {
  try {
    const { id, title, status, position, prevPosition, nextPosition } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    // Fetch the existing card to check if it exists
    const { rows: existingRows } = await query('SELECT * FROM cards WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const existingCard = existingRows[0];
    let newTitle = title !== undefined ? title : existingCard.title;
    let newStatus = status !== undefined ? status : existingCard.status;
    let newPosition = existingCard.position;

    // Calculate position if repositioning occurs
    if (position !== undefined) {
      newPosition = position;
    } else if (prevPosition !== undefined || nextPosition !== undefined) {
      const prev = prevPosition !== undefined ? parseFloat(prevPosition) : null;
      const next = nextPosition !== undefined ? parseFloat(nextPosition) : null;

      if (prev !== null && next !== null) {
        newPosition = (prev + next) / 2.0;
      } else if (prev !== null) {
        newPosition = prev + 1000.0;
      } else if (next !== null) {
        newPosition = next - 1000.0;
      }
    } else if (status !== undefined && status !== existingCard.status) {
      // If column changed but position wasn't explicitly set, put it at the bottom of the new column
      const { rows: maxRows } = await query(
        'SELECT MAX(position) as max_pos FROM cards WHERE status = $1',
        [status]
      );
      const maxPos = maxRows[0]?.max_pos;
      newPosition = maxPos !== null && maxPos !== undefined ? maxPos + 1000.0 : 1000.0;
    }

    const { rows } = await query(
      'UPDATE cards SET title = $1, status = $2, position = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [newTitle, newStatus, newPosition, id]
    );

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating card:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

// DELETE: Delete a card
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const { rowCount } = await query('DELETE FROM cards WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: parseInt(id) });
  } catch (error: any) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
