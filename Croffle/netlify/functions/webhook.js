// Netlify Function: LINE Webhook
// เมื่อใครส่งข้อความหา Bot จะได้รับ User ID ของตัวเองกลับมา
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'LINE Webhook OK' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const events = body.events || [];
    const token  = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!token) return { statusCode: 200, body: 'ok' };

    for (const e of events) {
      if (e.type === 'message' && e.source && e.replyToken) {
        const userId = e.source.userId || 'ไม่พบ';
        // ตอบกลับด้วย User ID
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            replyToken: e.replyToken,
            messages: [{
              type: 'text',
              text: '🆔 User ID ของคุณคือ:\n' + userId + '\n\nนำไปวางใน LINE_OWNER_USER_ID_2 ใน Netlify ได้เลยค่ะ'
            }]
          })
        });
      }
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Webhook error:', err);
    return { statusCode: 200, body: 'ok' };
  }
};
