// Función para formatear fecha y hora
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Función para formatear fecha corta
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX');
};

// Función para obtener fecha y hora actual formateada
export const getCurrentDateTime = () => {
  return formatDateTime(new Date().toISOString());
};

// Función para determinar el estado del programa
export const getProgramStatus = (remainingMeters, totalMeters) => {
  if (remainingMeters <= 0) {
    return 'completed';
  }
  if (remainingMeters <= (totalMeters * 0.2)) {
    return 'expiring';
  }
  return 'active';
};

// Función principal para generar el HTML del ticket
// Generate the ticket HTML. Accept an optional logoUrl so callers can pass
// an absolute URL or a data URL when root-relative paths ("/momenti-logo.jpg")
// don't resolve in the printing context (e.g. blob/window.open/data URLs).
export const generateTicketHTML = (ticketData, signatureDataURL, logoUrl = '/momenti-logo.jpg') => {
  const { client, order } = ticketData;
  const currentDateTime = getCurrentDateTime();
  const remainingAfterOrder = client.remainingMeters;
  const previousMeters = (client.remainingMeters || 0) + (order.metersConsumed || 0);
  const programStatus = getProgramStatus(remainingAfterOrder, client.totalMeters);

  // Fallbacks seguros
  const registeredBy = order.registeredBy || '—';
  const clientePhone = client.celular || client.numeroWpp;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket Programa de Lealtad - ${client.name}</title>
        <style>
          @media print {
            @page { size: 80mm auto; margin: 2mm; }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 12px;
              line-height: 1.3;
              margin: 0;
              padding: 0;
              width: 76mm; /* Optimizado para POS 80mm */
            }
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 4px; /* Padding reducido para POS */
            width: 76mm;
            background: white;
            color: black;
            box-sizing: border-box;
          }
          .container { max-width: 100%; margin: 0 auto; padding: 0 2px; box-sizing: border-box; }
          .logo { display: block; margin: 0 auto 8px auto; width: 100px; max-width: 100%; height: auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 10px; color: #222; }
          .header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
          .loyalty-section { background: #f8f9fa; border: 1px solid #333; border-radius: 2px; padding: 6px; margin: 8px 0; font-size: 12px; }
          .signature-section { border: 1px dashed #000; margin: 8px 0; padding: 6px; text-align: center; }
          .signature-box { border-bottom: 1px solid #000; height: 40px; margin: 6px 0; background: white; display: flex; align-items: center; justify-content: center; }
          .row { display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 11px; }
          .status-alert { text-align: center; margin: 3px 0; padding: 2px; border: 1px solid #000; background: #f0f0f0; }
          .footer { text-align: center; margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px; }
          .items-section { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Logo -->
          <img src="${logoUrl}" alt="Momenti Logo" class="logo" />
          
          <!-- Header -->
          <div class="header">
            <div class="bold" style="font-size: 14px;">SUCURSAL MATRIZ</div>
            <div style="font-size: 11px;">Fco. Villa 3700, local 17</div>
            <div style="font-size: 11px;">Tel: 6146822183</div>
          </div>

          <!-- Información básica -->
          <div style="margin-bottom: 6px; font-size: 11px;">
            <div><strong>Folio:</strong> ${order.folio || '—'}</div>
            <div><strong>Fecha:</strong> ${currentDateTime}</div>
            <div><strong>Cliente:</strong> ${client.name}</div>
            <div><strong>Tel cliente:</strong> ${clientePhone}</div>
            <div><strong>Le atendió:</strong> ${registeredBy}</div>
            <div><strong>Entrega:</strong> ${formatDate(order.recordedAt)}</div>
          </div>

          <!-- Sección del Programa de Lealtad -->
          <div class="loyalty-section">
            <div class="center bold" style="margin-bottom: 4px; font-size: 12px;">
              === PROGRAMA DE LEALTAD ===
            </div>
            <div class="center bold" style="margin-bottom: 6px; font-size: 13px;">
              ${String(client.type || '').toUpperCase()}
            </div>
            
            <div class="row"><span>Metros del programa:</span><span class="bold">${(client.totalMeters || 0).toFixed(2)}m</span></div>
            <div class="row"><span>Metros anteriores:</span><span>${previousMeters.toFixed(2)}m</span></div>
            <div class="row"><span class="bold">Metros consumidos:</span><span class="bold">-${(order.metersConsumed || 0).toFixed(2)}m</span></div>
            <div style="border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
              <div class="row" style="font-size: 13px;"><span class="bold">METROS RESTANTES:</span><span class="bold">${remainingAfterOrder.toFixed(2)}m</span></div>
            </div>

            ${programStatus === 'completed' ? `<div class="status-alert"><div class="bold" style="font-size: 12px;">*** PROGRAMA COMPLETADO ***</div></div>` : ''}
            ${programStatus === 'expiring' ? `<div class="status-alert"><div class="bold" style="font-size: 12px;">*** PROXIMO A EXPIRAR ***</div></div>` : ''}
          </div>

          ${order.observaciones ? `<div style="margin: 6px 0; font-size: 11px;"><div class="bold">Observaciones:</div><div style="font-style: italic;">${order.observaciones}</div></div>` : ''}

          <!-- Sección de firma -->
          <div class="signature-section">
            <div class="bold" style="margin-bottom: 4px; font-size: 12px;">AUTORIZACION DEL CLIENTE</div>
            <div style="margin-bottom: 6px; font-size: 10px;">Confirmo el consumo de ${(order.metersConsumed || 0).toFixed(2)} metros</div>
            <div class="signature-box">${signatureDataURL ? `<img src="${signatureDataURL}" class="signature-image" alt="Firma del cliente" style="max-width: 100%; max-height: 35px;" />` : ''}</div>
            <div class="small">Firma del cliente</div>
            <div class="small" style="margin-top: 2px;">Fecha: ${formatDate(order.recordedAt)}</div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div style="font-size: 12px;">¡Gracias por tu preferencia!</div>
            <div class="bold" style="font-size: 13px;">GRACIAS POR SU COMPRA</div>
            <div style="margin-top: 4px; font-size: 10px;">Conserve este comprobante</div>
          </div>
        </div>
      </body>
    </html>
  `;
};