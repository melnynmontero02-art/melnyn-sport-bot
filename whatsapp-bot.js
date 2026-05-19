// ============================================================
//  MELNYN SPORT — WhatsApp-bot.js
//  v4.0 — Auto-guarda contactos nuevos en Google Contacts
// ============================================================
require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const twilio = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversations = new Map();

const SYSTEM_PROMPT = `Eres MelBot, asistente de MELNYN SPORT, tienda streetwear masculina en RD. Estilo: dominicano, directo, urbano. Instagram: @MELNYNSPORT2. Horario: Lun-Sab 9am-7pm.

CUANDO ALGUIEN ESCRIBA SALUDOS (hola, klk, qloq, buenas, hey, brot, lider, manito, jefe, dimelo, wey, oye, ey, etc) responde EXACTAMENTE:

"Wey brot, bienvenido a MELNYN SPORT 🔥 ¿Qué estás buscando hoy bro?

1️⃣ Ver productos y precios
2️⃣ Hacer un pedido
3️⃣ Hablar con un representante"

CUANDO ESCRIBA "1" responde:
"🔥 Ve nuestro catálogo aquí: instagram.com/MELNYNSPORT2

Mándanos el screenshot del producto que te guste y te cotizamos al momento 📸💯"

CUANDO ESCRIBA "2" responde:
"Perfecto bro 🛒 Mándanos el screenshot del producto desde instagram.com/MELNYNSPORT2"

CUANDO ESCRIBA "3" responde:
"Claro bro 👊 ¿Cuál es tu nombre para avisarle al equipo? ✅"

CUANDO MANDE FOTO/SCREENSHOT responde:
"Recibido 📸✅ Un momento, el equipo te confirma disponibilidad y precio."

REGLAS: Máximo 2 oraciones. Español dominicano streetwear. Emojis: 🔥👟💯✅📸`;

app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim() || '';
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  if (!from) return res.status(400).send('Bad Request');
  
  const twiml = new twilio.twiml.MessagingResponse();
  
  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);
  const userMsg = mediaUrl ? '[imagen enviada]' : incomingMsg;
  history.push({ role: 'user', content: userMsg });
  if (history.length > 10) history.splice(0, history.length - 10);
  
 let reply;
let attempts = 0;
while (attempts < 3) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: history
    });
    reply = response.content[0].text;
    break;
  } catch (error) {
    attempts++;
    console.error(`Intento ${attempts}:`, error.message);
    if (attempts < 3) await new Promise(r => setTimeout(r, 1500));
  }
}
if (reply) {
  history.push({ role: 'assistant', content: reply });
  twiml.message(reply);
} else {
  twiml.message('Un momento bro 👊 Te respondemos en breve. Mientras visita instagram.com/MELNYNSPORT2 🔥');
}
res.type('text/xml').send(twiml.toString());
});

app.get('/', (req, res) => res.send('MELNYN SPORT Bot activo 🔥'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot corriendo en puerto ${PORT}`));
