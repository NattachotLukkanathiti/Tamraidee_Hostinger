import { Router } from 'express';
import { pool } from '../database/db';
import { actorName } from '../lib/helpers';

const router = Router();

router.get('/api/chat', async (req, res) => {
  try {
    const limitParam = typeof req.query.limit === 'string' ? req.query.limit : '10';
    const offsetParam = typeof req.query.offset === 'string' ? req.query.offset : '0';

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    // นำ LEFT JOIN todos กลับมา แต่เลือกดึงเฉพาะ profile
    const result = await pool.query(
      `SELECT 
         chat.id, chat.sender, chat.message, chat.created_at, 
         chat.is_read, chat.picture, chat.reply_to_id,
         todos.profile AS user_profile,
         reply.message AS reply_message,
         reply.sender AS reply_sender
       FROM chat 
       LEFT JOIN todos ON chat.sender = todos.username
       LEFT JOIN chat AS reply ON chat.reply_to_id = reply.id
       ORDER BY chat.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const formattedRows = result.rows.reverse().map(row => ({
      id: row.id,
      sender: row.sender,
      message: row.message,
      created_at: row.created_at,
      is_read: row.is_read,
      picture: row.picture,
      profile: row.user_profile, // ใช้ profile จาก todos
      reply_to_id: row.reply_to_id,
      reply_message: row.reply_message,
      reply_sender: row.reply_sender
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.put('/api/chat/read', async (req, res) => {
  const username = actorName(req, req.body.username);
  
  try {
    // อัปเดตข้อความที่คนอื่นส่งมา ให้กลายเป็นอ่านแล้ว (is_read = true)
    await pool.query(
      `UPDATE chat SET is_read = true WHERE sender != $1`, 
      [username]
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating read status:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/api/chat', async (req, res) => {
  try {
    const { message, picture, reply_to_id, profile } = req.body;
    const sender = actorName(req, req.body.sender);

    if (!sender || !message) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูล sender และ message' });
    }

    const insertResult = await pool.query(
      `INSERT INTO chat (sender, message, picture, reply_to_id, profile) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [sender, message, picture || null, reply_to_id || null, profile || null] 
    );

    const newChat = insertResult.rows[0];

    res.status(201).json({ 
      success: true, 
      data: newChat
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// อัปเดตสถานะกำลังพิมพ์
router.post('/api/chat/typing', async (req, res) => {
  const { is_typing } = req.body;
  const username = actorName(req, req.body.username);
  await pool.query(
    `INSERT INTO chat_typing (username, is_typing) VALUES ($1, $2) 
     ON CONFLICT (username) DO UPDATE SET is_typing = $2, updated_at = NOW()`,
    [username, is_typing]
  );
  res.sendStatus(200);
});

// ดึงสถานะคนอื่นที่กำลังพิมพ์
router.get('/api/chat/typing/:username', async (req, res) => {
  const username = actorName(req, req.params.username);
  const result = await pool.query(
    `SELECT username FROM chat_typing WHERE username != $1 AND is_typing = true AND updated_at > NOW() - INTERVAL '5 seconds'`,
    [username]
  );
  res.json(result.rows);
});

export default router;
