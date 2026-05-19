# 🔥 MELNYN SPORT — Guía de Instalación del Bot de WhatsApp

## ¿Qué vas a necesitar?

| Requisito | Dónde conseguirlo | Costo estimado |
|---|---|---|
| API Key de Anthropic | anthropic.com | ~$5-15/mes |
| Cuenta Twilio | twilio.com | ~$10-20/mes |
| Servidor en Railway | railway.app | ~$5/mes |
| Número SIM para el bot | Claro / Altice / Viva | RD$200-500 |

**Total estimado: RD$ 800 - 2,000/mes** (según volumen de mensajes)

---

## PASO 1 — Obtener API Key de Anthropic

1. Entra a **anthropic.com**
2. Crea una cuenta
3. Ve a "API Keys" en tu dashboard
4. Crea una nueva key y cópiala
5. Guárdala en el archivo `.env` como `ANTHROPIC_API_KEY`

---

## PASO 2 — Configurar Twilio para WhatsApp

1. Entra a **twilio.com** y crea una cuenta
2. Ve a **Messaging → Sandbox for WhatsApp**
3. Para producción: solicita un número de WhatsApp Business aprobado
4. Copia tu **Account SID** y **Auth Token** del dashboard
5. Guárdalos en el archivo `.env`

---

## PASO 3 — Subir el bot a Railway (servidor)

1. Entra a **railway.app** y crea una cuenta (con GitHub)
2. Crea un nuevo proyecto → "Deploy from GitHub repo"
3. Sube los archivos del bot a un repositorio de GitHub
4. En Railway, ve a **Variables** y agrega todas las del archivo `.env.example`
5. Railway te da una URL automáticamente (ej: `melnyn-bot.railway.app`)

---

## PASO 4 — Conectar Twilio con el servidor

1. En Twilio, ve a tu número de WhatsApp o Sandbox
2. En "When a message comes in", coloca tu URL:
   ```
   https://TU-URL.railway.app/webhook
   ```
3. Método: **HTTP POST**
4. Guarda los cambios

---

## PASO 5 — Probar el bot

1. Envía un mensaje de WhatsApp al número configurado
2. El bot debe responder en segundos
3. ¡Listo! Tu bot de MELNYN SPORT está activo 🔥

---

## Personalización fácil

Para cambiar las respuestas del bot, edita el `SYSTEM_PROMPT` en `whatsapp-bot.js`:

- **Cambiar horarios**: Modifica la línea `Horario de atención`
- **Agregar productos**: Agrega al final del prompt una sección `PRODUCTOS DESTACADOS`
- **Cambiar tono**: Modifica las instrucciones de personalidad
- **Agregar número de WhatsApp**: Cambia `BUSINESS_WHATSAPP` en `.env`

---

## ¿Necesitas ayuda?

Si tienes preguntas con la instalación, puedes contratar soporte técnico o
escribirnos. El código está listo — solo necesitas configurar las cuentas.

---

*Bot generado para MELNYN SPORT 🔥 | Powered by Claude AI*
