require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3001/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/contacts'],
  prompt: 'consent'
});

const server = http.createServer(async (req, res) => {
  if (req.url.includes('favicon')) { res.end(); return; }
  if (!req.url.includes('code=')) { res.end('Esperando autorización...'); return; }
  try {
    const code = new URL(req.url, 'http://localhost:3001').searchParams.get('code');
    const { tokens } = await oauth2Client.getToken(code);
    let env = fs.readFileSync('.env', 'utf8');
    env = env.replace(/GOOGLE_REFRESH_TOKEN=.*/g, '').trim() + `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    fs.writeFileSync('.env', env);
    res.end('<h1 style="font-family:sans-serif;color:#25D366">✅ AUTORIZADO</h1><p>Ya puedes cerrar esta ventana.</p>');
    console.log('\n✅ TOKEN GUARDADO. Cierra con Ctrl+C\n');
  } catch (e) {
    res.end('❌ Error: ' + e.message);
    console.error(e);
  }
});

server.listen(3001, () => {
  console.log('\n🔐 Servidor activo en puerto 3001');
  console.log('🌐 Abriendo navegador...\n');
  exec(`open "${authUrl}"`);
});
