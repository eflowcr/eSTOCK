/**
 * Maps technical backend error messages to human-friendly translation keys.
 * Use these keys with the translation service to display user-friendly messages.
 */
const TECHNICAL_TO_HUMAN: Array<{ pattern: string | RegExp; key: string }> = [
  // Inventory - serial and lot associations
  { pattern: /inventario_serial|inventory_serial/i, key: 'errors.inventory_serial_failed' },
  { pattern: /inventario_lote|inventory_lot/i, key: 'errors.inventory_lot_failed' },
  { pattern: /asociación de.*serial|asociación de.*serie/i, key: 'errors.serial_association_failed' },
  { pattern: /asociación de.*lote/i, key: 'errors.lot_association_failed' },
  { pattern: /error al crear serial|failed to create serial/i, key: 'errors.serial_create_failed' },
  { pattern: /error al crear lote|failed to create lot/i, key: 'errors.lot_create_failed' },
  { pattern: /error al verificar serial|failed to.*serial/i, key: 'errors.serial_check_failed' },
  { pattern: /error al verificar lote|failed to.*lot/i, key: 'errors.lot_check_failed' },
  { pattern: /eliminar asociación de número de serie|eliminar asociación de serie/i, key: 'errors.serial_delete_failed' },
  { pattern: /eliminar asociación de lote/i, key: 'errors.lot_delete_failed' },

  // Inventory general
  { pattern: /error al crear inventario|failed to create inventory/i, key: 'errors.inventory_create_failed' },
  { pattern: /error al actualizar inventario|failed to update inventory/i, key: 'errors.inventory_update_failed' },
  { pattern: /error al verificar inventario existente/i, key: 'errors.inventory_check_failed' },
  // Only match short technical form; backend may return helpful "Use una ubicación diferente" message
  { pattern: /el inventario con este SKU ya existe en la ubicación especificada/i, key: 'errors.inventory_duplicate_sku_location' },
  { pattern: /artículo no encontrado para el SKU|Artículo con SKU.*no encontrado/i, key: 'errors.article_not_found_sku' },
  { pattern: /error al crear movimiento de inventario/i, key: 'errors.inventory_movement_failed' },

  // Receiving / picking tasks
  { pattern: /Formato de items inválido|invalid.*items/i, key: 'errors.invalid_items_format' },
  { pattern: /El número de entrada ya está en uso|inbound number.*already taken/i, key: 'errors.inbound_number_taken' },
  { pattern: /El número de salida ya está en uso|outbound number.*already taken/i, key: 'errors.outbound_number_taken' },
  { pattern: /Error en la transacción|Transaction failed/i, key: 'errors.transaction_failed' },
  { pattern: /Serial numbers count.*does not match|La suma de las cantidades de lotes/i, key: 'errors.quantity_mismatch' },
  { pattern: /failed to create inventory_serial association/i, key: 'errors.inventory_serial_failed' },
  { pattern: /failed to create inventory_lot association/i, key: 'errors.inventory_lot_failed' },
  { pattern: /failed to retrieve existing lot|failed to update lot status/i, key: 'errors.lot_operation_failed' },
  { pattern: /La línea de recepción ya ha sido procesada/i, key: 'errors.line_already_processed' },
  { pattern: /La tarea de recepción ya está cerrada/i, key: 'errors.task_already_closed' },
  { pattern: /SKU no encontrado en los items|Artículo no encontrado para SKU/i, key: 'errors.sku_not_in_task' },
  { pattern: /El campo 'Assigned To' es obligatorio|assigned to is required/i, key: 'errors.assigned_to_required' },
  { pattern: /No se encontraron items para importar|no items/i, key: 'errors.no_items_to_import' },
  { pattern: /Fila de encabezado.*no encontrada|headers not found/i, key: 'errors.import_headers_not_found' },
  { pattern: /El archivo de Excel no tiene datos|empty sheet/i, key: 'errors.excel_empty' },

  // Users & auth
  { pattern: /El correo electrónico ya existe|email.*already exists/i, key: 'errors.email_already_exists' },
  { pattern: /Credenciales inválidas|invalid.*credentials/i, key: 'errors.invalid_credentials' },
  { pattern: /Su cuenta está inactiva|account.*inactive/i, key: 'errors.account_inactive' },
  { pattern: /No se puede eliminar el usuario debido a relaciones/i, key: 'errors.user_has_relations' },

  // Location types
  { pattern: /Location type with this code already exists/i, key: 'errors.location_type_code_exists' },
  { pattern: /Location type not found/i, key: 'errors.location_type_not_found' },

  // Presentation types
  { pattern: /Presentation type with this code already exists/i, key: 'errors.presentation_type_code_exists' },
  { pattern: /Presentation type not found/i, key: 'errors.presentation_type_not_found' },

  // Articles
  { pattern: /Ya existe un artículo con el mismo SKU|SKU.*already exists/i, key: 'errors.sku_already_exists' },

  // Generic technical patterns (catch-all)
  { pattern: /error al (crear|actualizar|eliminar|obtener|verificar)/i, key: 'errors.operation_failed_generic' },
  { pattern: /Error al (crear|actualizar|eliminar|obtener|verificar)/i, key: 'errors.operation_failed_generic' },
  { pattern: /failed to (create|update|delete|retrieve|check)/i, key: 'errors.operation_failed_generic' },
];

/**
 * Returns a translation key for human-friendly display if the raw message matches
 * a known technical pattern. Returns null if no match.
 */
export function getHumanizedErrorKey(rawMessage: string): string | null {
  if (!rawMessage || typeof rawMessage !== 'string') return null;
  const normalized = rawMessage.trim();
  if (!normalized) return null;

  for (const { pattern, key } of TECHNICAL_TO_HUMAN) {
    const matches =
      typeof pattern === 'string'
        ? normalized.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(normalized);
    if (matches) return key;
  }
  return null;
}

/** Technical indicators: backend jargon we want to hide from users */
const TECHNICAL_INDICATORS = /inventario_serial|inventario_lote|_association|error al crear|error al verificar|failed to (create|update|delete|retrieve)/i;

/** Heuristic: message looks like backend jargon rather than user-friendly text */
function looksTechnical(msg: string): boolean {
  return TECHNICAL_INDICATORS.test(msg) || (msg.length < 25 && /error|failed|al crear|al verificar/i.test(msg));
}

/**
 * Returns a human-friendly error message.
 * - If the raw message matches a known technical pattern, returns the translated friendly message.
 * - If the raw message looks user-friendly (e.g. contextual backend message), returns it as-is.
 * - Otherwise returns the translated fallback.
 */
export function humanizeApiError(
  rawMessage: string,
  translate: (key: string) => string,
  fallbackKey: string
): string {
  const humanKey = getHumanizedErrorKey(rawMessage);
  if (humanKey) {
    const translated = translate(humanKey);
    return translated !== humanKey ? translated : translate(fallbackKey);
  }
  if (rawMessage && !looksTechnical(rawMessage)) {
    return rawMessage;
  }
  return translate(fallbackKey);
}
