// ============================================================
//  MELNYN SPORT — Lista de Precios
//  ✏️  Edita este archivo cuando cambien los precios
//  Luego reinicia el servidor para que tome los cambios
// ============================================================

const PRECIOS = {
  categorias: [
    {
      nombre: "👕 Camisetas",
      items: [
        { producto: "Básica oversize",     precio: "RD$850"  },
        { producto: "Gráfica premium",     precio: "RD$1,200" },
      ]
    },
    {
      nombre: "👖 Pantalones",
      items: [
        { producto: "Jogger cargo",        precio: "RD$1,800" },
        { producto: "Shorts streetwear",   precio: "RD$1,100" },
      ]
    },
    {
      nombre: "🧥 Hoodies & Tops",
      items: [
        { producto: "Hoodie clásico",      precio: "RD$2,500" },
      ]
    },
    {
      nombre: "🧢 Accesorios",
      items: [
        { producto: "Cap bordada",         precio: "RD$700"  },
      ]
    }
  ]
};

// Genera el mensaje formateado automáticamente
function getPreciosMsg() {
  let msg = "🔥 *MELNYN SPORT — Precios*\n";
  msg += "─────────────────────\n";
  PRECIOS.categorias.forEach(cat => {
    msg += `\n${cat.nombre}\n`;
    cat.items.forEach(i => {
      msg += `  • ${i.producto} — *${i.precio}*\n`;
    });
  });
  msg += "\n─────────────────────\n";
  msg += "📸 Ve nuestro catálogo completo:\n";
  msg += "👉 instagram.com/MELNYNSPORT2\n\n";
  msg += "¿Ves algo que te guste? *Mándanos el cap del producto* y te lo apartamos 💯🛒";
  return msg;
}

module.exports = { PRECIOS, getPreciosMsg };
