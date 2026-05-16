module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { message, order } = req.body || {};
  const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId1 = process.env.LINE_OWNER_USER_ID;
  const userId2 = process.env.LINE_OWNER_USER_ID_2;

  if (!token || !userId1) return res.status(200).json({ status: 'skipped' });

  const userIds = [userId1, userId2].filter(Boolean);
  const flexMsg = buildFlexMessage(order || {}, message || '');

  const results = await Promise.all(userIds.map(uid =>
    fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: uid, messages: [flexMsg] })
    }).then(r => ({ uid, ok: r.ok }))
  ));

  return res.status(200).json({ results });
};

function buildFlexMessage(order, fallbackText) {
  const items = Array.isArray(order.items) ? order.items : Object.values(order.items || {});
  const name  = order.customerName || 'ไม่ระบุชื่อ';
  const time  = order.time || '';
  const total = order.totRev || 0;
  const note  = order.note || '';
  const itemRows = items.map(i => ({
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: i.name + ' x' + i.qty, size: 'sm', color: '#555555', flex: 3, wrap: true },
      { type: 'text', text: 'THB' + (i.sell * i.qty), size: 'sm', color: '#111111', align: 'end', flex: 1, weight: 'bold' }
    ], paddingBottom: '4px'
  }));
  const noteSection = note ? [
    { type: 'separator', margin: 'md' },
    { type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: 'Note', size: 'sm', flex: 0 },
        { type: 'text', text: note, size: 'sm', color: '#E65100', wrap: true, margin: 'sm' }
      ]}
  ] : [];
  return {
    type: 'flex', altText: 'New order from ' + name + ' THB' + total,
    contents: {
      type: 'bubble',
      header: { type: 'box', layout: 'vertical', paddingAll: '14px', backgroundColor: '#3D1F07',
        contents: [
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'New Order!', color: '#F5A623', size: 'lg', weight: 'bold', flex: 1 },
            { type: 'text', text: time, color: '#ffffff99', size: 'sm', align: 'end', gravity: 'center' }
          ]},
          { type: 'text', text: name, color: '#ffffffcc', size: 'md', margin: 'xs' }
        ]},
      body: { type: 'box', layout: 'vertical', paddingAll: '14px',
        contents: [...itemRows,
          { type: 'separator', margin: 'md' },
          { type: 'box', layout: 'horizontal', margin: 'md', contents: [
            { type: 'text', text: 'Total', size: 'md', weight: 'bold', color: '#3D1F07', flex: 1 },
            { type: 'text', text: 'THB' + total, size: 'lg', weight: 'bold', color: '#2E7D32', align: 'end' }
          ]}, ...noteSection
        ]}
    }
  };
}
