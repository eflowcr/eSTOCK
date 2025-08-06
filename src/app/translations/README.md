# Translations

Este directorio contiene todas las traducciones de la aplicación eSTOCK.

## Estructura

- `es.ts` - Traducciones en español
- `en.ts` - Traducciones en inglés  
- `index.ts` - Archivo que exporta todas las traducciones

## Cómo agregar nuevas traducciones

### 1. Agregar una nueva clave de traducción

Para agregar una nueva clave de traducción, edita los archivos `es.ts` y `en.ts`:

**es.ts:**
```typescript
export const esTranslations = {
  // ... traducciones existentes
  'nueva_clave': 'Nuevo texto en español'
};
```

**en.ts:**
```typescript
export const enTranslations = {
  // ... traducciones existentes
  'nueva_clave': 'New text in English'
};
```

### 2. Usar la traducción en un componente

```typescript
// En el componente
constructor(private languageService: LanguageService) {}

// En el template
{{ t('nueva_clave') }}

// En el código TypeScript
this.languageService.t('nueva_clave')
```

### 3. Agregar un nuevo idioma

1. Crear un nuevo archivo (ej: `fr.ts` para francés):
```typescript
export const frTranslations = {
  'welcome': 'Bienvenue à eSTOCK',
  // ... todas las claves traducidas
};
```

2. Actualizar `index.ts`:
```typescript
import { frTranslations } from './fr';

export const translations = {
  es: esTranslations,
  en: enTranslations,
  fr: frTranslations
};
```

3. Actualizar `LanguageService` para incluir el nuevo idioma en `availableLanguages`.

## Convenciones

- Usar snake_case para las claves de traducción
- Mantener las claves descriptivas pero concisas
- Agrupar claves relacionadas con prefijos comunes cuando sea apropiado
- Siempre agregar traducciones para todos los idiomas soportados
