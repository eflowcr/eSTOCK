import { Injectable } from '@angular/core';
import { Article } from '@app/models/article.model';
import { Location } from '@app/models/location.model';
import { Lot } from '@app/models/lot.model';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { PickingTask } from '@app/models/picking-task.model';
import { ArticleService } from './article.service';
import { LocationService } from './location.service';
import { LotService } from './lot.service';
import { ReceivingTaskService } from './receiving-task.service';
import { PickingTaskService } from './picking-task.service';

const LIMIT = 5;
const CACHE_SIZE = 5;

export interface QuickSearchResult {
  articles: Article[];
  locations: Location[];
  lots: Lot[];
  tasks: { receiving: ReceivingTask[]; picking: PickingTask[] };
}

interface CacheEntry {
  query: string;
  result: QuickSearchResult;
}

@Injectable({ providedIn: 'root' })
export class QuickSearchService {
  private cache: CacheEntry[] = [];

  constructor(
    private articleService: ArticleService,
    private locationService: LocationService,
    private lotService: LotService,
    private receivingTaskService: ReceivingTaskService,
    private pickingTaskService: PickingTaskService,
  ) {}

  async search(query: string): Promise<QuickSearchResult> {
    const q = query.trim();
    if (!q) return this.empty();

    const cached = this.cache.find((e) => e.query === q);
    if (cached) return cached.result;

    const [articlesRes, lotsRes, receivingRes, pickingRes, locationsRes] = await Promise.allSettled([
      this.articleService.search({ search: q, limit: LIMIT }),
      this.lotService.search({ search: q, limit: LIMIT }),
      this.receivingTaskService.search({ search: q }),
      this.pickingTaskService.search({ search: q }),
      // LocationService has no search param — fetch-all + client filter (S3 debt: add ?search= to backend)
      this.locationService.getAll(),
    ]);

    const articles =
      articlesRes.status === 'fulfilled' && articlesRes.value?.result?.success
        ? (articlesRes.value.data ?? [])
        : [];

    const lots =
      lotsRes.status === 'fulfilled' && lotsRes.value?.result?.success
        ? (lotsRes.value.data ?? [])
        : [];

    const allLocations =
      locationsRes.status === 'fulfilled' && locationsRes.value?.result?.success
        ? (locationsRes.value.data ?? [])
        : [];
    // S3 debt: backend /api/locations should accept ?search= to avoid full fetch
    const ql = q.toLowerCase();
    const locations = allLocations
      .filter(
        (l) =>
          l.location_code.toLowerCase().includes(ql) ||
          (l.description ?? '').toLowerCase().includes(ql),
      )
      .slice(0, LIMIT);

    const allReceiving =
      receivingRes.status === 'fulfilled' && receivingRes.value?.result?.success
        ? (receivingRes.value.data ?? [])
        : [];
    const receiving = allReceiving.slice(0, LIMIT);

    const allPicking =
      pickingRes.status === 'fulfilled' && pickingRes.value?.result?.success
        ? (pickingRes.value.data ?? [])
        : [];
    const picking = allPicking.slice(0, LIMIT);

    const result: QuickSearchResult = {
      articles,
      locations,
      lots,
      tasks: { receiving, picking },
    };

    this.cache = [{ query: q, result }, ...this.cache].slice(0, CACHE_SIZE);
    return result;
  }

  invalidate(): void {
    this.cache = [];
  }

  private empty(): QuickSearchResult {
    return { articles: [], locations: [], lots: [], tasks: { receiving: [], picking: [] } };
  }
}
