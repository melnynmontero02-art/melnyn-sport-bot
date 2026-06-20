require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Conexión a Neon (inventario del POS)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Consulta real al inventario ───────────────────────────────────────────────
async function consultarInventario(busqueda) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        p.name,
        p.code,
        p.sale_price,
        p.status,
        c.name AS category,
        COALESCE(
          json_agg(
            json_build_object('size', v.size, 'color', v.color, 'quantity', v.quantity)
            ORDER BY v.size, v.color
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) AS variants
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      WHERE
        p.status != 'INACTIVE'
        AND (
          p.name ILIKE $1
          OR c.name ILIKE $1
          OR p.brand ILIKE $1
          OR p.code ILIKE $1
        )
      GROUP BY p.id, p.name, p.code, p.sale_price, p.status, c.name
      ORDER BY p.name
      LIMIT 5
    `, [`%${busqueda}%`]);

    if (rows.length === 0) {
      return `No encontré "${busqueda}" en el inventario actual.`;
    }

    return rows.map(p => {
      const disponibles = p.variants.filter(v => v.quantity > 0);
      const agotadas = p.variants.filter(v => v.quantity === 0);
      const totalStock = p.variants.reduce((s, v) => s + v.quantity, 0);

      let info = `*${p.name}* (${p.category})\n`;
      info += `Precio: RD$${Number(p.sale_price).toLocaleString('es-DO')}\n`;

      if (totalStock === 0) {
        info += `Estado: AGOTADO ❌`;
      } else {
        info += `Disponible: ${totalStock} unidades\n`;
        const tallaMap = {};
        disponibles.forEach(v => {
          if (!tallaMap[v.size]) tallaMap[v.size] = [];
          tallaMap[v.size].push(`${v.color} (${v.quantity})`);
        });
        info += `Tallas/Stock: ${Object.entries(tallaMap).map(([t, c]) => `${t}: ${c.join(', ')}`).join(' | ')}`;
        if (agotadas.length > 0) {
          const agotadasTallas = [...new Set(agotadas.map(v => v.size))];
          info += `\nAgotado en: ${agotadasTallas.join(', ')}`;
        }
      }
      return info;
    }).join('\n\n');
  } finally {
    client.release();
  }
}

async function listarCategorias() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT c.name, COUNT(p.id) AS total
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status != 'INACTIVE'
      WHERE c.active = true
      GROUP BY c.name
      ORDER BY c.name
    `);
    if (rows.length === 0) return 'No hay categorías disponibles aún.';
    return rows.map(r => `• ${r.name} (${r.total} productos)`).join('\n');
  } finally {
    client.release();
  }
}

// ── Herramientas para Claude ──────────────────────────────────────────────────
const tools = [
  {
    name: 'consultar_inventario',
    description: 'Consulta el inventario real de la tienda para saber si hay stock de un producto, tallas disponibles y precio actual. Úsala cuando el cliente pregunte por disponibilidad, tallas, colores, stock o precio de algún producto.',
    input_schema: {
      type: 'object',
      properties: {
        busqueda: {
          type: 'string',
          description: 'Nombre del producto, categoría o código a buscar (ej: "jean", "oversize", "gorra", "PRD-001")',
        },
      },
      required: ['busqueda'],
    },
  },
  {
    name: 'listar_categorias',
    description: 'Lista todas las categorías de productos disponibles en la tienda. Úsala cuando el cliente pregunte qué tipos de ropa o productos venden.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

const SYSTEM_PROMPT = `Eres el vendedor oficial de MELNYN SPORT, una tienda dominicana de ropa urbana y streetwear masculino.

=====================================================
INVENTARIO EN TIEMPO REAL
=====================================================

Tienes acceso directo al inventario real de la tienda a través de herramientas.
SIEMPRE usa "consultar_inventario" cuando el cliente pregunte por:
- disponibilidad de algún producto
- tallas disponibles
- precios
- stock
- colores disponibles

NUNCA inventes precios ni stock. Si el cliente pregunta por algo, primero consulta.

=====================================================
SALUDO INICIAL
=====================================================
Si escriben: hola, klk, qloq, buenas, hey, brot, ey, wey, qué lo que, cómo tá, alo
Responde EXACTAMENTE: "Ey bro 👌 bienvenido a MELNYN SPORT 🔥 ¿Cómo podemos ayudarte?"

=====================================================
PERSONALIDAD
=====================================================

- exclusiva
- premium
- moderna
- segura
- flow dominicano elegante
- streetwear premium

NO hables como robot. Habla como un vendedor real dominicano con flow premium.
Respuestas cortas y naturales. Usa emojis moderadamente 🔥👌👟✨

=====================================================
FLOW Y LENGUAJE
=====================================================

USA: exclusivo, premium, fino, clean, elegante, top, flow, pieza exclusiva, colección exclusiva
EVITA: durísimo, heavy, matando, bacanísimo

=====================================================
INSTAGRAM
=====================================================

Instagram oficial: https://instagram.com/melnynsport2

SI EL CLIENTE QUIERE VER PRODUCTOS:
"Claro bro 🔥 entra aquí y mira la colección exclusiva 👇
https://instagram.com/melnynsport2
Mándame capture del modelo que te guste 👌"

=====================================================
DELIVERY Y PAGOS
=====================================================

- Delivery en toda República Dominicana
- Horario: 10:00 AM - 8:30 PM

MÉTODOS DE PAGO:
BANRESERVAS — Cuenta ahorros: 9600512917
BHD León — Cuenta ahorros: 24519040013
POPULAR — Cuenta ahorros: 803833888
Titular: Esmelnyn Montero Rosario | Cédula: 40225444914
Aceptamos: transferencia, contra entrega, efectivo

=====================================================
PEDIDOS
=====================================================

SI EL CLIENTE QUIERE ORDENAR pide:
- nombre, dirección, sector, teléfono, talla, color, método de pago

FORMATO DE CONFIRMACIÓN:
PEDIDO CONFIRMADO 🔥
Nombre:
Teléfono:
Dirección:
Producto:
Talla:
Color:
Método de pago:

=====================================================
UBICACIÓN
=====================================================

F6MJ+VG, Santo Domingo Este 11501

=====================================================
HABLAR CON HUMANO
=====================================================

SI EL CLIENTE QUIERE HABLAR CON HUMANO:
"Claro bro 👌 te voy a comunicar con Melnyn."

=====================================================
REGLAS IMPORTANTES
=====================================================

- Nunca hables como bot
- Nunca inventes precios ni stock — siempre consulta el inventario
- Mantén conversación natural
- No repitas saludos
- Responde basado en el último mensaje`;

// ── Historial de conversaciones ───────────────────────────────────────────────
async function getConversationHistory(from) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone', from)
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;
    return (data || []).map(row => ({ role: row.role, content: row.content }));
  } catch (err) {
    console.error('Error fetching history:', err.message);
    return [];
  }
}

async function saveMessage(from, role, content) {
  try {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    await supabase.from('conversations').insert({ phone: from, role, content: text });
  } catch (err) {
    console.error('Error saving message:', err.message);
  }
}

// ── Webhook WhatsApp ──────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim() || '';
  const from = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  if (!from) return res.status(400).send('Bad Request');

  const twiml = new twilio.twiml.MessagingResponse();

  const history = await getConversationHistory(from);
  const userMsg = mediaUrl ? '[imagen enviada]' : incomingMsg;
  history.push({ role: 'user', content: userMsg });
  await saveMessage(from, 'user', userMsg);

  let reply = null;
  let attempts = 0;

  while (attempts < 3 && !reply) {
    try {
      // Primera llamada a Claude (puede usar tools)
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        tools,
        messages: history,
      });

      // Si Claude quiere usar una herramienta
      if (response.stop_reason === 'tool_use') {
        const toolUse = response.content.find(b => b.type === 'tool_use');
        let toolResult = '';

        if (toolUse.name === 'consultar_inventario') {
          toolResult = await consultarInventario(toolUse.input.busqueda);
        } else if (toolUse.name === 'listar_categorias') {
          toolResult = await listarCategorias();
        }

        // Segunda llamada con el resultado del tool
        const response2 = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          tools,
          messages: [
            ...history,
            { role: 'assistant', content: response.content },
            { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: toolResult }] },
          ],
        });

        reply = response2.content.find(b => b.type === 'text')?.text;
      } else {
        reply = response.content.find(b => b.type === 'text')?.text;
      }

    } catch (error) {
      attempts++;
      console.error(`Intento ${attempts}:`, error.message);
      if (attempts < 3) await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (reply) {
    await saveMessage(from, 'assistant', reply);
    twiml.message(reply);
  } else {
    twiml.message('Un momento bro 👊 Te respondemos en breve. Visita instagram.com/MELNYNSPORT2 🔥');
  }

  res.type('text/xml').send(twiml.toString());
});

app.get('/', (req, res) => res.send('MELNYN SPORT Bot activo 🔥'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot corriendo en puerto ${PORT} 🔥`));
