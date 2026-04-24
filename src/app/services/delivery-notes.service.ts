import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { DeliveryNote, DeliveryNoteListFilters } from '@app/models/delivery-note.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/delivery-notes';
export const DELIVERY_NOTES_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class DeliveryNotesService {
  constructor(private fetchService: FetchService) {}

  async list(filters?: DeliveryNoteListFilters): Promise<ApiResponse<DeliveryNote[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<DeliveryNote[]>>({
      API_Gateway: qs ? `${DELIVERY_NOTES_URL}/?${qs}` : `${DELIVERY_NOTES_URL}/`,
    });
  }

  async getById(id: string): Promise<ApiResponse<DeliveryNote>> {
    return this.fetchService.get<ApiResponse<DeliveryNote>>({
      API_Gateway: `${DELIVERY_NOTES_URL}/${id}`,
    });
  }

  async downloadPdf(id: string): Promise<Blob> {
    return this.fetchService.download({
      API_Gateway: `${DELIVERY_NOTES_URL}/${id}/pdf`,
    });
  }
}
