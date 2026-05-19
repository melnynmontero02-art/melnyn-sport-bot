// ============================================================
//  MELNYN SPORT — Bot de WhatsApp con IA
//  v4.0 — Auto-guarda contactos nuevos en Google Contacts
// ============================================================
require('dotenv').config();

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const twilio = require('twilio');
const { getPreciosMsg } = require('./precios');
const { google } = require('googleapis');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversations = new Map();
const contactosGuardados = new Set(); // En memoria para esta sesión

// ============================================================
//  GOOGLE CONTACTS — Configuración
// ============================================================
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3001/callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const peopleApi = google.people({ version: 'v1', auth: oauth2Client });

async function agregarContactoGoogle(numero, primerMensaje) {
  const numeroLimpio = numero.replace('whatsapp:', '').replace(/\s/g, '');
  try {
    await peopleApi.people.createContact({
      requestBody: {
        names: [{ givenName: 'Cliente WhatsApp', familyName: numeroLimpio }],
        phoneNumbers: [{ value: numeroLimpio, type: 'mobile' }],
        biographies: [{
          value: `Cliente de MELNYN SPORT via WhatsApp\nPrimer mensaje: "${primerMensaje.substring(0, 80)}"\nFecha: ${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}`,
          contentType: 'TEXT_PLAIN'
        }],
        organizations: [{ name: 'MELNYN SPORT - WhatsApp' }]
      }
    });
    console.log(`✅ Contacto agregado a Google: ${numeroLimpio}`);
    return true;
  } catch (err) {
    console.error(`❌ Error Google Contacts: ${err.message}`);
    return false;
  }
}

// ============================================================
//  TRIGGERS DE PRECIOS
// ============================================================
const PRECIO_TRIGGERS = [
  'precio', 'precios', 'cuánto', 'cuanto', 'cuesta', 'costo',
  'vale', 'cuestan', 'valen', 'catalogo', 'catálogo', 'lista',
  'que tienen', 'qué tienen', 'disponible', 'info'
];

function esPreguntaDePrecios(msg) {
  const lower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PRECIO_TRIGGERS.some(t => lower.includes(t));
}

// ============================================================
//  SYSTEM PROMPT
// ============================================================
const SYSTEM_PROMPT = `Eres MelBot, el asistente virtual de MELNYN SPORT, tienda de ropa masculina streetwear en República Dominicana.

Tu estilo es 100% streetwear: directo, cool, urbano. Mezclas español dominicano con términos como "bro", "fire", "drip". Eres genuino, no robótico.

INFORMACIÓN DEL NEGOCIO:
- Tienda física en Santo Domingo + ventas online
- Horario: Lunes a Sábado, 9am a 7pm
- Instagram: @MELNYNSPORT2
- Métodos de pago: Efectivo, Transferencia bancaria, Pago contraentrega

FLUJO CUANDO PREGUNTEN POR PRECIOS:
1. Envía la lista de precios
2. Diles que vean el catálogo en instagram.com/MELNYNSPORT2
3. Pídeles que manden el cap del producto que quieren

CUANDO ALGUIEN MANDA UNA FOTO:
- Confirma que la recibiste
- Diles que el equipo responde enseguida
- Pide su nombre para dar seguimiento

REGLAS:
- Máximo 2-3 oraciones. Breve y directo.
- Usa emojis: 🔥 👟 🧢 💯 ✅ 📸
- NUNCA inventes precios específicos
- Responde en español dominicano con toque streetwear`;

// ============================================================
//  WEBHOOK
// ============================================================
app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim() || '';
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;

  if (!from) return res.status(400).send('Bad Request');

  // ── Auto-guardar contacto nuevo en Google Contacts ─────────
  if (!contactosGuardados.has(from)) {
    contactosGuardados.add(from);
    agregarContactoGoogle(from, incomingMsg || '[imagen]'); // Async, no bloquea la respuesta
  }

  console.log(`[${new Date().toLocaleString('es-DO')}] ${from}: ${incomingMsg}${mediaUrl ? ' [IMAGEN]' : ''}`);

  const twiml = new twilio.twiml.MessagingResponse();

  // ── Precios ─────────────────────────────────────────────────
  if (esPreguntaDePrecios(incomingMsg) && !mediaUrl) {
    twiml.message(getPreciosMsg());
    return res.type('text/xml').send(twiml.toString());
  }

  // ── Foto / cap ──────────────────────────────────────────────
  if (mediaUrl) {
    twiml.message('¡Recibido bro! 📸🔥 Nuestro equipo te confirma disponibilidad y precio ahora mismo. ¿Cuál es tu nombre para darte seguimiento? ✅');
    return res.type('text/xml').send(twiml.toString());
  }

  // ── IA ──────────────────────────────────────────────────────
  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);
  history.push({ role: 'user', content: incomingMsg });
  if (history.length > 10) history.splice(0, history.length - 10);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: history
    });
    const reply = response.content[0].text;
    history.push({ role: 'assistant', content: reply });
    twiml.message(reply);
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error:', error.message);
    twiml.message('Disculpa bro, hubo un error 😅 Visítanos en instagram.com/MELNYNSPORT2 🔥');
    res.type('text/xml').send(twiml.toString());
  }
});

app.get('/', (req, res) => res.send('🔥 MELNYN SPORT Bot v4.0 — Google Contacts activo'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot corriendo en puerto ${PORT}`));
