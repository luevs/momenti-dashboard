# 🧪 GUÍA DE TESTING PARA MOMENTI DASHBOARD

## 1. INSTALAR HERRAMIENTAS DE TESTING

```bash
# Para tu proyecto React con Vite
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Para pruebas end-to-end
npm install --save-dev playwright
```

## 2. ESTRUCTURA DE CARPETAS

```
momenti-dashboard/
├── src/
│   ├── components/
│   ├── pages/
│   └── utils/
├── tests/                    ← NUEVA CARPETA
│   ├── unit/                ← Pruebas de funciones
│   │   ├── utils.test.js
│   │   └── components/
│   ├── integration/         ← Pruebas de páginas completas
│   │   └── clientes-lealtad.test.js
│   └── e2e/                ← Pruebas de usuario completo
│       └── customer-journey.spec.js
└── package.json
```

## 3. EJEMPLOS REALES PARA TU PROYECTO

### 🔬 Prueba UNITARIA (función individual)
```javascript
// tests/unit/utils.test.js
import { test, expect } from 'vitest'

// Probando tu función de cálculo de metros
function calculateRemainingMeters(originalMeters, usedMeters) {
  return Math.max(0, originalMeters - usedMeters)
}

test('calcular metros restantes correctamente', () => {
  expect(calculateRemainingMeters(100, 30)).toBe(70)
  expect(calculateRemainingMeters(50, 60)).toBe(0) // No puede ser negativo
})
```

### 🧩 Prueba de INTEGRACIÓN (página completa)
```javascript
// tests/integration/clientes-lealtad.test.js
import { render, screen } from '@testing-library/react'
import ClientesLealtad from '../../src/pages/clientes-lealtad.jsx'

test('página de clientes carga correctamente', () => {
  render(<ClientesLealtad />)
  expect(screen.getByText('Programas de Lealtad')).toBeInTheDocument()
})
```

### 🎭 Prueba END-TO-END (usuario real)
```javascript
// tests/e2e/customer-journey.spec.js
import { test, expect } from '@playwright/test'

test('cliente puede ver su historial de pedidos', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await page.fill('[data-testid="cliente-input"]', '486')
  await page.click('[data-testid="buscar-button"]')
  await expect(page.getByText('IC estampados')).toBeVisible()
})
```

## 4. COMANDOS PARA EJECUTAR PRUEBAS

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas unitarias
npm run test:unit

# Ejecutar pruebas e2e
npm run test:e2e

# Ver coverage (qué tan bien están probadas tus funciones)
npm run test:coverage
```

## 5. CUÁNDO SE EJECUTAN AUTOMÁTICAMENTE

### En tu computadora:
- Cuando ejecutas `npm test`
- Al guardar archivos (modo watch)

### En GitHub (automático):
- Cada vez que haces `git push`
- Antes de hacer merge a main
- En pull requests

### En producción:
- Antes de publicar en Netlify
- Como parte del pipeline de deployment