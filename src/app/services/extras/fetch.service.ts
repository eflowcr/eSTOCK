import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse, Fetch, UploadFiles } from '@app/models';
import { mediaRequestHeaders, requestHeaders } from '@app/utils/get-token';
import { returnCompleteURI, handleError } from '@app/utils';
import { lastValueFrom, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { RedirectService } from './redirect.service';
import { environment } from '@environment';

@Injectable({
  providedIn: 'root',
})
export class FetchService {
  constructor(
    private http: HttpClient,
    private redirectService: RedirectService,
  ) {}

  enviroment = environment.API.BASE;
  Simple() {
    this.http.get(`${this.enviroment}/`);
  }

  // #region Deprecated
  /**
   *
   * @description Get data from the server
   * @param {Fetch} {URI, API_Gateway}
   * @returns {Observable<T>}
   * @memberof FetchService
   * @version 4.0.0.0
   * @deprecated
   */
  getFile<T>({ URI, API_Gateway: apiGateway }: Fetch): Observable<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    const response = this.http.get<T>(url, requestHeaders())
      .pipe(catchError((error) => handleError(error, this.redirectService)));
    return response;
  }

  /**
   *
   * @description Post data to the server
   * @param {Fetch} {URI, API_Gateway, values}
   * @returns {Observable<T>}
   * @memberof FetchService
   * @version 4.0.0.0
   */
  postFile<T>({ URI, API_Gateway: apiGateway, values }: Fetch): Observable<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    const response = this.http.post<T>(url, values, requestHeaders())
      .pipe(catchError((error) => handleError(error, this.redirectService)));

    return response;
  }

  // Promise
  /**
   *
   * @description Get data from the server
   * @param {Fetch} {URI, API_Gateway}
   * @returns {Promise<T>}
   * @memberof FetchService
   * @version 4.17.0.11
   */
  get<T>({ URI, API_Gateway: apiGateway }: Fetch): Promise<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.get<T>(url, requestHeaders())
        .pipe(catchError((error) => handleError(error, this.redirectService))));
  }

  /**
   *
   * @description Post data to the server
   * @param {Fetch} {URI, API_Gateway, values}
   * @returns {Promise<T>}
   * @memberof FetchService
   * @version 4.17.0.11
   */
  post<T>({ URI, API_Gateway: apiGateway, values }: Fetch): Promise<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.post<T>(url, values, requestHeaders())
        .pipe(catchError((error) => handleError(error, this.redirectService))),
    );
  }

  /**
   *
   * @description Updated data to the server
   * @param {Fetch} {URI, API_Gateway, data}
   * @returns {Promise<T>}
   * @memberof FetchService
   * @version 4.17.0.11
   */
  put<T>({ URI, API_Gateway: apiGateway, values }: Fetch): Promise<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.put<T>(url, values, requestHeaders())
        .pipe(catchError((error) => handleError(error, this.redirectService))),
    );
  }

  /**
   * @description Patch data to the server
   * @param {Fetch} {URI, API_Gateway, values}
   * @returns {Promise<T>}
   * @memberof FetchService
   * @version 4.17.0.11
   */
  patch<T>({ URI, API_Gateway: apiGateway, values }: Fetch): Promise<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.patch<T>(url, values, requestHeaders())
        .pipe(catchError((error) => handleError(error, this.redirectService))),
    );
  }

  /**
   * @description Delete data from the server
   * @param {Fetch} {URI, API_Gateway}
   * @returns {Promise<T>}
   * @memberof FetchService
   * @version 4.17.0.11
   */
  delete<T>({ URI, API_Gateway: apiGateway }: Fetch): Promise<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.delete<T>(url, requestHeaders())
        .pipe(catchError((error) => handleError(error, this.redirectService))),
    );
  }

  /**
   * @description Upload files to the server
   * @param {UploadFiles} {URI, API_Gateway, data}
   * @returns Promise<T>
   * @memberof FetchService
   * @version 4.17.0.11
   */
  upload<T>({ URI, API_Gateway: apiGateway, data }: UploadFiles): Promise<T> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.post<T>(url, data, mediaRequestHeaders())
        .pipe(catchError((error) => handleError(error, this.redirectService))),
    );
  }

  /**
   * @description Generic file download (response as Blob)
   * @param {Fetch} {URI, API_Gateway}
   * @returns Promise<Blob>
   * @memberof FetchService
   * @version 4.17.0.11
   */
  download({ URI, API_Gateway: apiGateway }: Fetch): Promise<Blob> {
    const url = returnCompleteURI({ URI, API_Gateway: apiGateway });
    return lastValueFrom(
      this.http.get(url, {
        ...requestHeaders(),
        responseType: 'blob',
      }).pipe(catchError((error) => handleError(error, this.redirectService))),
    );
  }
}
