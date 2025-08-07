import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Article, CreateArticleRequest, UpdateArticleRequest, ArticleSearchParams } from '@app/models/article.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/articles';
export const ARTICLE_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class ArticleService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all articles
	 * @returns Promise<ApiResponse<Article[]>>
	 */
	async getAll(): Promise<ApiResponse<Article[]>> {
		return await this.fetchService.get<ApiResponse<Article[]>>({
			API_Gateway: `${ARTICLE_URL}/`,
		});
	}

	/**
	 * @description Get article by ID
	 * @param id Article ID
	 * @returns Promise<ApiResponse<Article>>
	 */
	async getById(id: number): Promise<ApiResponse<Article>> {
		return await this.fetchService.get<ApiResponse<Article>>({
			API_Gateway: `${ARTICLE_URL}/${id}`,
		});
	}

	/**
	 * @description Get article by SKU
	 * @param sku Article SKU
	 * @returns Promise<ApiResponse<Article>>
	 */
	async getBySku(sku: string): Promise<ApiResponse<Article>> {
		return await this.fetchService.get<ApiResponse<Article>>({
			API_Gateway: `${ARTICLE_URL}/sku/${sku}`,
		});
	}

	/**
	 * @description Create new article
	 * @param article Article data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(article: CreateArticleRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${ARTICLE_URL}/`,
			values: article,
		});
	}

	/**
	 * @description Update article by ID
	 * @param id Article ID
	 * @param data Partial article data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: number, data: UpdateArticleRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${ARTICLE_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete article by ID
	 * @param id Article ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async delete(id: number): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${ARTICLE_URL}/${id}`,
		});
	}

	/**
	 * @description Search articles with filters
	 * @param params Search parameters
	 * @returns Promise<ApiResponse<Article[]>>
	 */
	async search(params: ArticleSearchParams): Promise<ApiResponse<Article[]>> {
		const searchParams = new URLSearchParams();
		
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const url = queryString ? `${ARTICLE_URL}/?${queryString}` : `${ARTICLE_URL}/`;

		return await this.fetchService.get<ApiResponse<Article[]>>({
			API_Gateway: url,
		});
	}

	/**
	 * @description Import articles from file
	 * @param file File to import
	 * @returns Promise<ApiResponse<any>>
	 */
	async importFile(file: File): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${ARTICLE_URL}/import`,
			values: formData,
		});
	}

	/**
	 * @description Export articles to file
	 * @param format Export format (csv or xlsx)
	 * @returns Promise<Blob>
	 */
	async exportFile(format: string = 'xlsx'): Promise<Blob> {
		return await this.fetchService.download({
			API_Gateway: `${ARTICLE_URL}/export/?format=${format}`,
		});
	}
}
