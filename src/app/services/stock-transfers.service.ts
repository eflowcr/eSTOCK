import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  StockTransfer,
  StockTransferLine,
  CreateStockTransferRequest,
  UpdateStockTransferRequest,
  StockTransferLineInput,
  UpdateStockTransferLineRequest,
} from '@app/models/stock-transfer.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/stock-transfers';
const BASE_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class StockTransfersService {
  constructor(private fetchService: FetchService) {}

  getList(status?: string): Promise<ApiResponse<StockTransfer[]>> {
    const path = status ? `${BASE_URL}/?status=${encodeURIComponent(status)}` : `${BASE_URL}/`;
    return this.fetchService.get<ApiResponse<StockTransfer[]>>({
      API_Gateway: path,
    });
  }

  getById(id: string): Promise<ApiResponse<StockTransfer>> {
    return this.fetchService.get<ApiResponse<StockTransfer>>({
      API_Gateway: `${BASE_URL}/${id}`,
    });
  }

  create(data: CreateStockTransferRequest): Promise<ApiResponse<StockTransfer>> {
    return this.fetchService.post<ApiResponse<StockTransfer>>({
      API_Gateway: `${BASE_URL}/`,
      values: data,
    });
  }

  update(id: string, data: UpdateStockTransferRequest): Promise<ApiResponse<StockTransfer>> {
    return this.fetchService.put<ApiResponse<StockTransfer>>({
      API_Gateway: `${BASE_URL}/${id}`,
      values: data,
    });
  }

  delete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${BASE_URL}/${id}`,
    });
  }

  execute(id: string): Promise<ApiResponse<StockTransfer>> {
    return this.fetchService.post<ApiResponse<StockTransfer>>({
      API_Gateway: `${BASE_URL}/${id}/execute`,
      values: {},
    });
  }

  getLines(transferId: string): Promise<ApiResponse<StockTransferLine[]>> {
    return this.fetchService.get<ApiResponse<StockTransferLine[]>>({
      API_Gateway: `${BASE_URL}/${transferId}/lines`,
    });
  }

  createLine(transferId: string, data: StockTransferLineInput): Promise<ApiResponse<StockTransferLine>> {
    return this.fetchService.post<ApiResponse<StockTransferLine>>({
      API_Gateway: `${BASE_URL}/${transferId}/lines`,
      values: data,
    });
  }

  updateLine(transferId: string, lineId: string, data: UpdateStockTransferLineRequest): Promise<ApiResponse<StockTransferLine>> {
    return this.fetchService.put<ApiResponse<StockTransferLine>>({
      API_Gateway: `${BASE_URL}/${transferId}/lines/${lineId}`,
      values: data,
    });
  }

  deleteLine(transferId: string, lineId: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${BASE_URL}/${transferId}/lines/${lineId}`,
    });
  }
}
