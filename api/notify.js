export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const LINE_TOKEN = '525WHjvCHdVBXp2r94+9S7+JF2r9lhZtHmpvb9BV5Ye/FkS5KI8Q46dUbMyriXngARqXpxoeeDasgKMyzD4MTvACAWAOrJ/71lE0t/PeNRBY5q5wE4BB1CjmLXoDBQkDpljgUNI3bvnj4a+y6n/rEgdB04t89/1O/w1cDnyilFU=';
  const LINE_USER_ID = 'U6446c2a760bc8577c20d82be95f988fa';

  const { message } = req.body;
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_TOKEN,
    },
    body: JSON.stringify({
      to: LINE_USER_ID,
      messages: [{ type: 'text', text: message }]
    })
  });

  const ok = response.ok;
  res.status(ok ? 200 : 500).json({ ok });
}
