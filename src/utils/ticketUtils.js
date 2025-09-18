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
              font-family: 'Courier New', monospace;
              font-size: 10px;
              line-height: 1.3;
              margin: 0;
              padding: 0;
              width: 76mm;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.3;
            margin: 0;
            padding: 5px;
            width: 76mm;
            background: white;
            color: black;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 8px; }
          
          .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 4px;
          }
          
          .loyalty-section {
            background: #f8f9fa;
            border: 1px solid #333;
            border-radius: 3px;
            padding: 6px;
            margin: 8px 0;
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
        <!-- Header -->
        <div class="header">
          <div class="bold">SUCURSAL MATRIZ</div>
          <div>Fco. Villa 3700, local 17</div>
          <div>Tel: 6146822183</div>
        </div>

        <!-- Información básica -->
        <div style="margin-bottom: 6px;">
          <div>Folio : ${order.folio}</div>
          <div>Fecha: ${currentDateTime}</div>
          <div>Cliente: ${client.name}</div>
          <div>Tel cliente: ${client.numeroWpp || '/'}</div>
          <div>Le atendió: ${order.registeredBy}</div>
          <div>Fecha de entrega: ${formatDate(order.recordedAt)}.</div>
        </div>

        <!-- Sección del Programa de Lealtad -->
        <div class="loyalty-section">
          <div class="center bold" style="margin-bottom: 4px;">
            === PROGRAMA DE LEALTAD ===
          </div>
          <div class="center bold" style="margin-bottom: 6px;">
            ${client.type.toUpperCase()}
          </div>
          
          <div class="row">
            <span>Metros del programa:</span>
            <span class="bold">${client.totalMeters.toFixed(1)}m</span>
          </div>
          
          <div class="row">
            <span>Metros anteriores:</span>
            <span>${previousMeters.toFixed(1)}m</span>
          </div>
          
          <div class="row">
            <span class="bold">Metros consumidos:</span>
            <span class="bold">-${order.metersConsumed.toFixed(1)}m</span>
          </div>
          
          <div style="border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
            <div class="row">
              <span class="bold">Metros restantes:</span>
              <span class="bold">${remainingAfterOrder.toFixed(1)}m</span>
            </div>
          </div>

          ${programStatus === 'completed' ? `
            <div class="status-alert">
              <div class="bold">*** PROGRAMA COMPLETADO ***</div>
            </div>
          ` : ''}

          ${programStatus === 'expiring' ? `
            <div class="status-alert">
              <div class="bold">*** PROXIMO A EXPIRAR ***</div>
            </div>
          ` : ''}
        </div>

        ${order.observaciones ? `
          <div style="margin-bottom: 6px;">
            <div class="bold">Observaciones:</div>
            <div class="small" style="font-style: italic;">
              ${order.observaciones}
            </div>
          </div>
        ` : ''}

        <!-- Items del pedido -->
        <div class="items-section">
          <div class="row bold" style="margin-bottom: 3px;">
            <span>Cant. Descripcion</span>
            <span>Importe</span>
          </div>
          
          <div>
            <div class="row" style="margin-bottom: 1px;">
              <span>${order.metersConsumed.toFixed(1)}</span>
              <span>$ 0.00</span>
            </div>
            <div style="margin-bottom: 2px;">
              <span>Metro</span>
            </div>
            <div style="margin-bottom: 3px;">
              <span>${client.type.toUpperCase()} - PROGRAMA LEALTAD</span>
            </div>
          </div>
        </div>

        <!-- Totales -->
        <div style="margin: 6px 0;">
          <div class="row">
            <span>Subtotal</span>
            <span>$ 0.00</span>
          </div>
          <div class="row">
            <span>Descuentos</span>
            <span>$ 0.00</span>
          </div>
          <div class="row">
            <span>Subtotal 2</span>
            <span>$ 0.00</span>
          </div>
          <div class="row bold">
            <span>Total</span>
            <span>$ 0.00</span>
          </div>
          <div class="row">
            <span>Saldo</span>
            <span>$ 0.00</span>
          </div>
        </div>

        <!-- Sección de firma -->
        <div class="signature-section">
          <div class="bold" style="margin-bottom: 4px;">
            AUTORIZACION DEL CLIENTE
          </div>
          <div class="small" style="margin-bottom: 6px;">
            Confirmo el consumo de ${order.metersConsumed.toFixed(1)} metros
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
          <div>¡Gracias por tu preferencia!</div>
          <div class="bold">GRACIAS POR SU COMPRA</div>
          <div class="small" style="margin-top: 4px;">
            Conserve este comprobante
          </div>
        </div>
      </body>
    </html>
  `;
};