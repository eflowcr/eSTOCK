export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  article_sku: string;
  qty: number;
  lot_numbers?: string[];
  notes?: string;
}

export interface DeliveryNote {
  id: string;
  dn_number: string;
  sales_order_id: string;
  picking_task_id?: string;
  customer_id: string;
  total_items: number;
  pdf_url?: string;
  pdf_generated_at?: string;
  delivered_at?: string;
  signed_by?: string;
  created_at: string;
  updated_at: string;
  // embeds
  items?: DeliveryNoteItem[];
  customer?: { id: string; code: string; name: string };
}

export interface DeliveryNoteListFilters {
  sales_order_id?: string;
  customer_id?: string;
  so_number?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}
