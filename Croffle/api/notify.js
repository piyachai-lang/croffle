// Vercel Serverless Function — LINE Messaging API proxy
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // Vercel auto-parses JSON body when Content-Type is application/json
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const { message, order, type: msgType } = body;

    const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId1 = process.env.LINE_OWNER_USER_ID;
    const userId2 = process.env.LINE_OWNER_USER_ID_2;

    console.log('notify called, type:', msgType, 'token set:', !!token, 'uid set:', !!userId1);

    if (!token || !userId1) {
      console.warn('LINE env vars not configured');
      return res.status(500).json({ error: 'LINE config missing. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_OWNER_USER_ID in Vercel env vars.' });
    }

    const userIds = [userId1, userId2].filter(Boolean);
    const flexMsg = (msgType === 'payment')
      ? buildPaymentFlexMessage(order || {})
      : buildFlexMessage(order || {}, message || '');

    const results = await Promise.all(userIds.map(async uid => {
      const r = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to: uid, messages: [flexMsg] })
      });
      const text = await r.text();
      console.log('LINE push uid:', uid, 'status:', r.status, 'body:', text);
      return { uid, ok: r.ok, status: r.status, body: text };
    }));

    const allOk = results.every(r => r.ok);
    if (!allOk) {
      return res.status(502).json({ error: 'LINE API error', results });
    }
    return res.status(200).json({ ok: true, results });

  } catch (err) {
    console.error('notify error:', err);
    return res.status(500).json({ error: String(err) });
  }
};

function buildPaymentFlexMessage(order) {
  const name     = order.customerName || '?';
  const total    = order.totRev || 0;
  const ordId    = order.id || '';
  const hasSlip  = !!order.hasSlip;
  const slipNote = hasSlip ? 'Slip attached - check admin panel' : 'Please verify bank transfer';
  const slipBadge = hasSlip ? [
    { type: 'separator', margin: 'sm' },
    { type: 'box', layout: 'horizontal', margin: 'sm',
      backgroundColor: '#E8F5E9', paddingAll: '8px', cornerRadius: '8px',
      contents: [{ type: 'text', text: 'Slip attached', color: '#2E7D32', size: 'sm', weight: 'bold', wrap: true }] }
  ] : [];
  const bodyContents = [
    { type: 'box', layout: 'horizontal', paddingBottom: '8px', contents: [
      { type: 'text', text: 'Customer', size: 'sm', color: '#888888', flex: 2 },
      { type: 'text', text: name, size: 'sm', color: '#111111', flex: 3, align: 'end', weight: 'bold', wrap: true }
    ]},
    { type: 'box', layout: 'horizontal', paddingBottom: '8px', contents: [
      { type: 'text', text: 'Amount', size: 'sm', color: '#888888', flex: 2 },
      { type: 'text', text: String(total) + ' THB', size: 'md', color: '#2E7D32', flex: 3, align: 'end', weight: 'bold' }
    ]},
    { type: 'separator', margin: 'sm' },
    { type: 'box', layout: 'horizontal', margin: 'sm',
      contents: [{ type: 'text', text: 'ID: ' + ordId, size: 'xs', color: '#aaaaaa', wrap: true }] }
  ].concat(slipBadge);
  return {
    type: 'flex',
    altText: '[Payment] ' + name + ' transferred ' + total + ' THB' + (hasSlip ? ' + slip' : ''),
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '14px', backgroundColor: '#1565C0',
        contents: [
          { type: 'text', text: 'QR - Payment Received', color: '#ffffff', size: 'lg', weight: 'bold' },
          { type: 'text', text: slipNote, color: '#ffffffaa', size: 'sm', margin: 'xs' }
        ]
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: bodyContents }
    }
  };
}

function buildFlexMessage(order, fallbackText) {
  const rawItems = order.items;
  const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems || {});
  const name    = order.customerName || '?';
  const time    = order.time || '';
  const total   = order.totRev || 0;
  const note    = order.note  || '';
  const isQR    = (order.paymentMethod || 'cash') === 'qr';
  const payLabel = isQR ? 'QR Code - Paid' : 'Cash on Delivery';
  const payBg    = isQR ? '#1565C0' : '#2E7D32';

  const itemRows = items.map(i => {
    const sw    = i.sweet ? ' [' + i.sweet + ']' : '';
    return {
      type: 'box', layout: 'horizontal', paddingBottom: '4px', contents: [
        { type: 'text', text: i.name + sw + ' x' + i.qty, size: 'sm', color: '#555555', flex: 3, wrap: true },
        { type: 'text', text: String(i.sell * i.qty) + 'B', size: 'sm', color: '#111111', align: 'end', flex: 1, weight: 'bold' }
      ]
    };
  });

  const bodyContents = itemRows.concat([
    { type: 'separator', margin: 'md' },
    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
      { type: 'text', text: 'Total', size: 'md', weight: 'bold', color: '#3D1F07', flex: 1 },
      { type: 'text', text: String(total) + ' THB', size: 'lg', weight: 'bold', color: '#2E7D32', align: 'end' }
    ]}
  ]);

  if (note) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'box', layout: 'horizontal', margin: 'md', contents: [
      { type: 'text', text: 'Note:', size: 'sm', flex: 0, color: '#888888' },
      { type: 'text', text: note, size: 'sm', color: '#E65100', wrap: true, margin: 'sm' }
    ]});
  }
  if (order.isPreorder && order.preorderDate) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: 'Pre-order: ' + order.preorderDate, size: 'sm', color: '#E65100', margin: 'md', wrap: true });
  }

  return {
    type: 'flex',
    altText: (isQR ? '[QR] ' : '[Cash] ') + 'Order from ' + name + ' ' + total + ' THB',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '14px', backgroundColor: '#3D1F07',
        contents: [
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'New Order!', color: '#F5A623', size: 'lg', weight: 'bold', flex: 1 },
            { type: 'text', text: time, color: '#ffffff99', size: 'sm', align: 'end', gravity: 'center' }
          ]},
          { type: 'text', text: 'Customer: ' + name, color: '#ffffffcc', size: 'md', margin: 'xs' },
          { type: 'box', layout: 'baseline', margin: 'sm', backgroundColor: payBg, paddingAll: '6px', cornerRadius: '8px',
            contents: [{ type: 'text', text: payLabel, color: '#ffffff', size: 'sm', weight: 'bold', wrap: true }] }
        ]
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: bodyContents }
    }
  };
}
