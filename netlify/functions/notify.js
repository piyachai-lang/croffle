// Netlify Function: LINE Messaging API proxy
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
      console.warn('LINE config not set');
      return { statusCode: 200, headers, body: JSON.stringify({ status: 'skipped' }) };
    }
    const userIds = [userId1, userId2].filter(Boolean);
    const msgType = body.type || 'order';
    const flexMsg = msgType === 'payment'
      ? buildPaymentFlexMessage(order || {})
      : buildFlexMessage(order || {}, message || '');
    const results = await Promise.all(userIds.map(uid =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: uid, messages: [flexMsg] })
      }).then(r => ({ uid, ok: r.ok, status: r.status }))
    ));
    console.log('LINE push results:', JSON.stringify(results));
    return { statusCode: 200, headers, body: JSON.stringify({ results }) };
  } catch (err) {
    console.error('LINE error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};

function buildPaymentFlexMessage(order) {
  var name     = order.customerName || '?';
  var total    = order.totRev || 0;
  var ordId    = order.id || '';
  var hasSlip  = order.hasSlip ? true : false;
  var slipNote = hasSlip ? 'Slip attached - check admin panel' : 'Please verify bank transfer';
  var slipBadge = hasSlip
    ? [{ type: 'separator', margin: 'sm' },
       { type: 'box', layout: 'horizontal', margin: 'sm', backgroundColor: '#E8F5E9', paddingAll: '8px', cornerRadius: '8px',
         contents: [{ type: 'text', text: 'Slip attached', color: '#2E7D32', size: 'sm', weight: 'bold', wrap: true }] }]
    : [];
  var bodyContents = [
    { type: 'box', layout: 'horizontal', paddingBottom: '8px',
      contents: [
        { type: 'text', text: 'Customer', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: name, size: 'sm', color: '#111111', flex: 3, align: 'end', weight: 'bold', wrap: true }
      ]
    },
    { type: 'box', layout: 'horizontal', paddingBottom: '8px',
      contents: [
        { type: 'text', text: 'Amount', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: String(total) + ' THB', size: 'md', color: '#2E7D32', flex: 3, align: 'end', weight: 'bold' }
      ]
    },
    { type: 'separator', margin: 'sm' },
    { type: 'box', layout: 'horizontal', margin: 'sm',
      contents: [{ type: 'text', text: 'ID: ' + ordId, size: 'xs', color: '#aaaaaa', wrap: true }] }
  ].concat(slipBadge);
  return {
    type: 'flex',
    altText: '[QR] ' + name + ' transferred ' + total + ' THB' + (hasSlip ? ' + slip' : ''),
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '14px',
        backgroundColor: '#1565C0',
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
  var rawItems = order.items;
  var items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems || {});
  var name    = order.customerName || '?';
  var time    = order.time || '';
  var total   = order.totRev || 0;
  var note    = order.note  || '';
  var payment = order.paymentMethod || 'cash';
  var isQR    = payment === 'qr';
  var payLabel = isQR ? 'QR Code - Paid' : 'Cash on Delivery';
  var payBg    = isQR ? '#1565C0' : '#2E7D32';
  var altText  = (isQR ? '[QR] ' : '[Cash] ') + 'Order from ' + name + ' ' + total + ' THB';

  var itemRows = items.map(function(i) {
    var sw    = i.sweet ? ' [' + i.sweet + ']' : '';
    var label = i.name + sw + ' x' + i.qty;
    return {
      type: 'box', layout: 'horizontal', paddingBottom: '4px',
      contents: [
        { type: 'text', text: label, size: 'sm', color: '#555555', flex: 3, wrap: true },
        { type: 'text', text: String(i.sell * i.qty) + 'B', size: 'sm', color: '#111111', align: 'end', flex: 1, weight: 'bold' }
      ]
    };
  });

  var bodyContents = itemRows.concat([
    { type: 'separator', margin: 'md' },
    { type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: 'Total', size: 'md', weight: 'bold', color: '#3D1F07', flex: 1 },
        { type: 'text', text: String(total) + ' THB', size: 'lg', weight: 'bold', color: '#2E7D32', align: 'end' }
      ]
    }
  ]);

  if (note) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: 'Note:', size: 'sm', flex: 0, color: '#888888' },
        { type: 'text', text: note, size: 'sm', color: '#E65100', wrap: true, margin: 'sm' }
      ]
    });
  }

  if (order.isPreorder && order.preorderDate) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: 'Pre-order: ' + order.preorderDate, size: 'sm', color: '#E65100', margin: 'md', wrap: true });
  }

  return {
    type: 'flex',
    altText: altText,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '14px',
        backgroundColor: '#3D1F07',
        contents: [
          { type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: 'New Order!', color: '#F5A623', size: 'lg', weight: 'bold', flex: 1 },
              { type: 'text', text: time, color: '#ffffff99', size: 'sm', align: 'end', gravity: 'center' }
            ]
          },
          { type: 'text', text: 'Customer: ' + name, color: '#ffffffcc', size: 'md', margin: 'xs' },
          { type: 'box', layout: 'baseline', margin: 'sm', backgroundColor: payBg,
            paddingAll: '6px', cornerRadius: '8px',
            contents: [{ type: 'text', text: payLabel, color: '#ffffff', size: 'sm', weight: 'bold', wrap: true }]
          }
        ]
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: bodyContents }
    }
  };
}
