// Netlify Function: LINE Messaging API proxy
// ใช้ Push Message ส่งข้อความหาเจ้าของร้านโดยตรง
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body || '{}');
    const { message, order } = body;

    const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId1 = process.env.LINE_OWNER_USER_ID;
    const userId2 = process.env.LINE_OWNER_USER_ID_2;

    if (!token || !userId1) {
      console.warn('LINE config not set — skipping notification');
      return { statusCode: 200, headers, body: JSON.stringify({ status: 'skipped' }) };
    }

    // รวม User IDs ที่ต้องการส่ง (กรองค่าว่างออก)
    const userIds = [userId1, userId2].filter(Boolean);

    // สร้าง Flex Message (การ์ดออเดอร์สวยๆ)
    const flexMsg = buildFlexMessage(order || {}, message || '');

    // ส่งหาทุกคนพร้อมกัน
    const results = await Promise.all(userIds.map(uid =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to: uid, messages: [flexMsg] })
      }).then(r => ({ uid, ok: r.ok, status: r.status }))
    ));

    console.log('LINE push results:', JSON.stringify(results));
    return { statusCode: 200, headers, body: JSON.stringify({ results }) };

  } catch (err) {
    console.error('LINE Messaging API error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};

// สร้าง Flex Message การ์ดออเดอร์
function buildFlexMessage(order, fallbackText) {
  const items  = Array.isArray(order.items) ? order.items : Object.values(order.items || {});
  const name   = order.customerName || 'ไม่ระบุชื่อ';
  const time   = order.time || '';
  const total  = order.totRev || 0;
  const note   = order.note  || '';

  // สร้าง rows ของแต่ละเมนู
  const itemRows = items.map(i => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: i.name + ' ×' + i.qty, size: 'sm', color: '#555555', flex: 3, wrap: true },
      { type: 'text', text: '฿' + (i.sell * i.qty), size: 'sm', color: '#111111', align: 'end', flex: 1, weight: 'bold' }
    ],
    paddingBottom: '4px'
  }));

  // เพิ่ม separator + หมายเหตุ ถ้ามี
  const noteSection = note ? [
    { type: 'separator', margin: 'md' },
    {
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: '📝', size: 'sm', flex: 0 },
        { type: 'text', text: note, size: 'sm', color: '#E65100', wrap: true, margin: 'sm' }
      ]
    }
  ] : [];

  return {
    type: 'flex',
    altText: '🛒 ออเดอร์ใหม่จาก ' + name + ' ฿' + total,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '14px',
        backgroundColor: '#3D1F07',
        contents: [
          {
            type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: '🛒 ออเดอร์ใหม่!', color: '#F5A623', size: 'lg', weight: 'bold', flex: 1 },
              { type: 'text', text: '🕐 ' + time, color: '#ffffff99', size: 'sm', align: 'end', gravity: 'center' }
            ]
          },
          { type: 'text', text: '👤 ' + name, color: '#ffffffcc', size: 'md', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '14px',
        contents: [
          ...itemRows,
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
              { type: 'text', text: 'รวมทั้งหมด', size: 'md', weight: 'bold', color: '#3D1F07', flex: 1 },
              { type: 'text', text: '฿' + total, size: 'lg', weight: 'bold', color: '#2E7D32', align: 'end' }
            ]
          },
          ...noteSection
        ]
      }
    }
  };
}
