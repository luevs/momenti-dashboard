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
export const generateTicketHTML = (ticketData, signatureDataURL) => {
  const { client, order } = ticketData;
  const currentDateTime = getCurrentDateTime();
  const remainingAfterOrder = client.remainingMeters;
  const previousMeters = client.remainingMeters + order.metersConsumed;
  const programStatus = getProgramStatus(remainingAfterOrder, client.totalMeters);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket Programa de Lealtad - ${client.name}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 2mm;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 14px;  /* Aumentado de 12px */
              line-height: 1.4;
              margin: 0;
              padding: 0;
              width: 76mm;
            }
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            margin: 0;
            padding: 5px;
            width: 76mm;
            background: white;
            color: black;
          }
          
          .logo {
            width: 120px;
            margin: 0 auto 10px auto;
            display: block;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 10px; }  /* Aumentado de 8px */
          
          .header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
          
          .loyalty-section {
            background: #f8f9fa;
            border: 1px solid #333;
            border-radius: 3px;
            padding: 8px;
            margin: 10px 0;
            font-size: 16px;  /* Texto más grande para esta sección */
          }
          
          .signature-section {
            border: 1px dashed #000;
            margin: 10px 0;
            padding: 8px;
            text-align: center;
          }
          
          .signature-box {
            border-bottom: 1px solid #000;
            height: 50px;
            margin: 8px 0;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .signature-image {
            max-width: 100%;
            max-height: 48px;
            object-fit: contain;
          }
          
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          
          .status-alert {
            text-align: center;
            margin: 4px 0;
            padding: 3px;
            border: 1px solid #000;
            background: #f0f0f0;
          }
          
          .footer {
            text-align: center;
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 4px;
          }
          
          .items-section {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 4px 0;
            margin: 6px 0;
          }
        </style>
      </head>
      <body>
        <!-- Logo -->
        <img src="/momenti-logo.jpg" alt="Momenti Logo" class="logo" />
        
        <!-- Header -->
        <div class="header">
          <div class="bold" style="font-size: 16px;">SUCURSAL MATRIZ</div>
          <div>Fco. Villa 3700, local 17</div>
          <div>Tel: 6146822183</div>
        </div>

        <!-- Información básica -->
        <div style="margin-bottom: 8px; font-size: 15px;">
          <div>Folio : ${order.folio}</div>
          <div>Fecha: ${currentDateTime}</div>
          <div>Cliente: ${client.name}</div>
          <div>Tel cliente: ${client.numeroWpp || '/'}</div>
          <div>Le atendió: ${order.registeredBy}</div>
          <div>Fecha de entrega: ${formatDate(order.recordedAt)}.</div>
        </div>

        <!-- Sección del Programa de Lealtad -->
        <div class="loyalty-section">
          <div class="center bold" style="margin-bottom: 6px; font-size: 14px;">
            === PROGRAMA DE LEALTAD ===
          </div>
          <div class="center bold" style="margin-bottom: 8px; font-size: 16px;">
            ${client.type.toUpperCase()}
          </div>
          
          <div class="row">
            <span>Metros del programa:</span>
            <span class="bold">${client.totalMeters.toFixed(2)}m</span>
          </div>
          
          <div class="row">
            <span>Metros anteriores:</span>
            <span>${previousMeters.toFixed(1)}m</span>
          </div>
          
          <div class="row">
            <span class="bold">Metros consumidos:</span>
            <span class="bold">-${order.metersConsumed.toFixed(2)}m</span>
          </div>
          
          <div style="border-top: 1px solid #000; padding-top: 6px; margin-top: 6px;">
            <div class="row" style="font-size: 18px;">
              <span class="bold">Metros restantes:</span>
              <span class="bold">${remainingAfterOrder.toFixed(2)}m</span>
            </div>
          </div>

          ${programStatus === 'completed' ? `
            <div class="status-alert">
              <div class="bold" style="font-size: 16px;">*** PROGRAMA COMPLETADO ***</div>
            </div>
          ` : ''}

          ${programStatus === 'expiring' ? `
            <div class="status-alert">
              <div class="bold" style="font-size: 16px;">*** PROXIMO A EXPIRAR ***</div>
            </div>
          ` : ''}
        </div>

        ${order.observaciones ? `
          <div style="margin: 10px 0;">
            <div class="bold">Observaciones:</div>
            <div style="font-style: italic;">
              ${order.observaciones}
            </div>
          </div>
        ` : ''}

        <!-- Sección de firma -->
        <div class="signature-section">
          <div class="bold" style="margin-bottom: 6px; font-size: 16px;">
            AUTORIZACION DEL CLIENTE
          </div>
          <div style="margin-bottom: 8px;">
            Confirmo el consumo de ${order.metersConsumed.toFixed(2)} metros
          </div>
          <div class="signature-box">
            ${signatureDataURL ? 
              `<img src="${signatureDataURL}" class="signature-image" alt="Firma del cliente" />` : 
              ''
            }
          </div>
          <div class="small">
            Firma del cliente
          </div>
          <div class="small" style="margin-top: 4px;">
            Fecha: ${formatDate(order.recordedAt)}
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div style="font-size: 16px;">¡Gracias por tu preferencia!</div>
          <div class="bold" style="font-size: 16px;">GRACIAS POR SU COMPRA</div>
          <div style="margin-top: 6px;">
            Conserve este comprobante
          </div>
        </div>
      </body>
    </html>
  `;
};