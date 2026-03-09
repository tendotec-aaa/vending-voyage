

## System-Wide Spanish Translation (i18n)

### Scope
Install `i18next` and `react-i18next`, create translation files, migrate all UI strings, add a language switcher in Settings, and default to Spanish.

### Step 1: Install & Configure i18next

Install `i18next`, `react-i18next`, and `i18next-browser-languagedetector`.

Create `src/i18n/index.ts` — initialize i18next with `es` as default language, fallback to `en`.

Create `src/i18n/en.json` and `src/i18n/es.json` with structured keys:

```json
{
  "sidebar": {
    "dashboard": "Panel Principal",
    "myDashboard": "Mi Panel",
    "operations": "Operaciones",
    "visitReports": "Reportes de Visita",
    "routes": "Rutas",
    "maintenance": "Mantenimiento",
    "warehouse": "Bodega",
    "assetsInventory": "Activos e Inventario",
    "inventoryValuation": "Inventario y Valoración",
    "machines": "Máquinas",
    "setups": "Configuraciones",
    "locations": "Ubicaciones",
    "spots": "Puntos de Venta",
    "supplyChain": "Cadena de Suministro",
    "suppliers": "Proveedores",
    "purchases": "Compras",
    "sales": "Ventas",
    "insights": "Análisis",
    "analytics": "Analíticas",
    "itemAnalytics": "Analítica de Mercadería",
    "spotHealth": "Salud de Puntos",
    "profitability": "Rentabilidad",
    "business": "Negocio",
    "users": "Usuarios",
    "company": "Empresa",
    "admin": "Administración",
    "operators": "Operadores",
    "security": "Seguridad",
    "personal": "Personal",
    "profile": "Perfil",
    "settings": "Configuración"
  },
  "profitability": {
    "revenue": "Ingresos",
    "expenses": "Gastos",
    "netProfit": "Utilidad Neta",
    "wac": "CPP (Costo Promedio Ponderado)"
  },
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "export": "Exportar",
    "loading": "Cargando...",
    "signOut": "Cerrar Sesión"
  }
}
```

English file mirrors the same keys with English values.

### Step 2: Initialize in App

Import `src/i18n/index.ts` in `src/main.tsx` before rendering. Wrap app with `I18nextProvider` (or use the auto-detection via `react-i18next`'s `initReactI18next` plugin — no provider needed).

### Step 3: Migrate Components (Initial Load)

Priority components to update with `useTranslation()` and `t('key')`:

| Component | Strings to migrate |
|-----------|-------------------|
| `AppSidebar.tsx` | All menu labels, group labels, "Operations Hub" subtitle |
| `OperatorDashboard.tsx` | Page title, stop labels, progress text, badges |
| `NewVisitReport.tsx` | Form labels, buttons, validation messages |
| `Profitability.tsx` | Revenue/Expenses/Net Profit, month names, column headers |
| `AppLayout.tsx` | Any static text |
| `Settings.tsx` | Section titles, labels, button text |
| `QuickActions.tsx` | Button labels |
| `ReconciliationTab.tsx` | Column headers, accuracy label, badges |

All other pages (Spots, Routes, Inventory, etc.) will also be migrated — every hardcoded string replaced with `t()` calls.

### Step 4: Language Switcher

Add a language toggle in `Settings.tsx` under the Appearance section:
- Two buttons: "Español" / "English"
- Calls `i18n.changeLanguage('es')` or `i18n.changeLanguage('en')`
- Persists choice to `localStorage` (i18next handles this via the language detector)
- Default for all users: Spanish (`es`)

### Step 5: Guayaquil Terminology

The Spanish translations will use local business terminology:

| English | Spanish (Guayaquil) |
|---------|-------------------|
| Warehouse | Bodega |
| Items/Products | Mercadería / Juguetes |
| WAC | CPP (Costo Promedio Ponderado) |
| Spot | Punto de Venta |
| Route | Ruta |
| Visit Report | Reporte de Visita |
| Revenue | Ingresos |
| Expenses | Gastos |
| Net Profit | Utilidad Neta |

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/i18n/index.ts` | New — i18next config |
| `src/i18n/en.json` | New — English translations |
| `src/i18n/es.json` | New — Spanish translations |
| `src/main.tsx` | Import i18n config |
| `src/components/layout/AppSidebar.tsx` | Use `t()` for all labels |
| `src/pages/Settings.tsx` | Add language switcher + translate labels |
| `src/pages/OperatorDashboard.tsx` | Translate all strings |
| `src/pages/NewVisitReport.tsx` | Translate form labels/buttons |
| `src/pages/Profitability.tsx` | Translate financial terms |
| `src/components/dashboard/QuickActions.tsx` | Translate button labels |
| `src/components/routes/ReconciliationTab.tsx` | Translate headers |
| All other page files | Migrate hardcoded strings to `t()` |

### Implementation Note

Given the size of this codebase (~50+ pages/components), implementation will proceed in batches: core infrastructure first, then sidebar + settings, then operator-facing pages, then admin pages.

