import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  TrendingUp,
  Tag,
  AlertCircle,
  Calendar,
  Building2,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/axios.ts';
import type { UserFeedback } from '@/types/index.ts';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [analytics, setAnalytics] = useState<{
    totalCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    topTags: { tag: string; count: number }[];
  }>({
    totalCount: 0,
    averageRating: 5.0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    topTags: [],
  });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: 20,
      };
      if (ratingFilter !== 'all') {
        params.rating = ratingFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get('/admin/reviews', { params });
      if (res.data.success) {
        setReviews(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
        if (res.data.analytics) {
          setAnalytics(res.data.analytics);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load reviews and feedback'));
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-ink'>
              User Reviews & Sentiment
            </h1>
            <span className='rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800'>
              3-Min In-App Feedback
            </span>
          </div>
          <p className='text-xs sm:text-sm text-ink-muted mt-1'>
            Feedback gathered from first-time dashboard visitors after 3 minutes of active platform exploration.
          </p>
        </div>

        <button
          onClick={fetchReviews}
          disabled={loading}
          className='inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-hairline bg-panel px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-panel-subtle transition-colors'
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {/* Rating Score Card */}
        <div className='rounded-xl border border-hairline bg-panel p-5 shadow-2xs flex flex-col justify-between'>
          <div className='flex items-center justify-between text-ink-subtle'>
            <span className='text-xs font-semibold uppercase tracking-wider'>
              Average Rating
            </span>
            <TrendingUp className='h-4 w-4 text-emerald-500' />
          </div>

          <div className='my-3 flex items-baseline gap-3'>
            <span className='text-4xl font-extrabold text-ink tabular-nums'>
              {analytics.averageRating.toFixed(1)}
            </span>
            <div className='flex items-center gap-1 text-amber-400'>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(analytics.averageRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className='text-xs text-ink-muted'>
            Based on <strong>{analytics.totalCount}</strong> authenticated user responses.
          </p>
        </div>

        {/* Rating Distribution Card */}
        <div className='rounded-xl border border-hairline bg-panel p-5 shadow-2xs'>
          <span className='text-xs font-semibold uppercase tracking-wider text-ink-subtle block mb-3'>
            Star Distribution
          </span>
          <div className='space-y-1.5'>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = analytics.ratingDistribution[stars] || 0;
              const pct = analytics.totalCount > 0 ? Math.round((count / analytics.totalCount) * 100) : 0;
              return (
                <div key={stars} className='flex items-center gap-2 text-xs'>
                  <span className='w-12 text-ink-muted flex items-center gap-1 font-medium'>
                    {stars} <Star className='h-3 w-3 fill-amber-400 text-amber-400' />
                  </span>
                  <div className='flex-1 h-2 rounded-full bg-canvas border border-hairline overflow-hidden'>
                    <div
                      className='h-full rounded-full bg-amber-400 transition-all duration-300'
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className='w-10 text-right tabular-nums text-ink-subtle font-medium'>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Sentiment Tags */}
        <div className='rounded-xl border border-hairline bg-panel p-5 shadow-2xs flex flex-col justify-between'>
          <span className='text-xs font-semibold uppercase tracking-wider text-ink-subtle block mb-2'>
            What Users Love Most
          </span>
          <div className='flex flex-wrap gap-1.5 overflow-y-auto max-h-32 py-1'>
            {analytics.topTags.length === 0 ? (
              <p className='text-xs text-ink-subtle italic'>No sentiment tags selected yet.</p>
            ) : (
              analytics.topTags.map(({ tag, count }) => (
                <span
                  key={tag}
                  className='inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200/80 px-2.5 py-1 text-xs font-semibold text-primary-800'
                >
                  <Tag className='h-3 w-3 text-primary-600' />
                  <span>{tag}</span>
                  <span className='rounded-full bg-primary-200/80 px-1.5 py-0.2 text-[10px] tabular-nums'>
                    {count}
                  </span>
                </span>
              ))
            )}
          </div>
          <p className='text-[11px] text-ink-subtle mt-2'>Aggregated from 1-tap sentiment chips</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4'>
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0'>
          {(
            [
              { id: 'all', label: 'All Reviews' },
              { id: 5, label: '5 Stars ★' },
              { id: 4, label: '4 Stars ★' },
              { id: 3, label: '3 Stars ★' },
              { id: 2, label: '1–2 Stars ★' },
            ] as const
          ).map((filter) => (
            <button
              key={String(filter.id)}
              onClick={() => {
                setRatingFilter(filter.id as any);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                ratingFilter === filter.id
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'text-ink-muted hover:bg-panel-subtle hover:text-ink'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className='relative w-full sm:w-72'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle' />
          <input
            type='text'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder='Search comment, user, email…'
            className='w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-hairline bg-panel text-ink placeholder:text-ink-subtle focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          />
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className='space-y-3'>
        {loading ? (
          <div className='py-12 text-center text-ink-subtle rounded-xl border border-hairline bg-panel'>
            <RefreshCw className='mx-auto h-6 w-6 animate-spin mb-2 text-primary-600' />
            Loading customer reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className='py-12 text-center text-ink-subtle rounded-xl border border-hairline bg-panel'>
            <AlertCircle className='mx-auto h-8 w-8 mb-2 text-ink-subtle opacity-40' />
            <p className='font-semibold text-ink'>No reviews found</p>
            <p className='text-xs mt-0.5'>
              {search ? 'Try clearing your search query.' : 'New reviews will appear here as users explore.'}
            </p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className='rounded-xl border border-hairline bg-panel p-4 sm:p-5 shadow-2xs space-y-3 hover:border-primary-300 transition-colors'
            >
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                <div className='flex items-center gap-3'>
                  <div className='h-9 w-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-sm'>
                    {(rev.userName || rev.userEmail || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold text-sm text-ink'>
                        {rev.userName || 'Anonymous User'}
                      </span>
                      {rev.user?.subscriptionTier && (
                        <span className='rounded-full bg-primary-50 border border-primary-200 px-2 py-0.2 text-[10px] font-bold uppercase text-primary-700'>
                          {rev.user.subscriptionTier}
                        </span>
                      )}
                    </div>
                    <div className='flex flex-wrap items-center gap-2 text-xs text-ink-muted mt-0.5'>
                      {rev.userEmail && (
                        <span className='flex items-center gap-1'>
                          <Mail className='h-3 w-3' /> {rev.userEmail}
                        </span>
                      )}
                      {rev.business?.businessName && (
                        <>
                          <span className='text-ink-subtle'>•</span>
                          <span className='flex items-center gap-1'>
                            <Building2 className='h-3 w-3' /> {rev.business.businessName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-3 self-start sm:self-auto'>
                  <div className='flex items-center gap-0.5'>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  <span className='text-[11px] text-ink-subtle flex items-center gap-1'>
                    <Calendar className='h-3 w-3' />
                    {new Date(rev.createdAt).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {rev.tags && rev.tags.length > 0 && (
                <div className='flex flex-wrap gap-1.5 pt-1'>
                  {rev.tags.map((tag) => (
                    <span
                      key={tag}
                      className='inline-flex items-center gap-1 rounded-md bg-panel-subtle border border-hairline px-2 py-0.5 text-[11px] font-medium text-ink'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Comment */}
              {rev.comment && (
                <div className='rounded-lg bg-panel-subtle/60 border border-hairline p-3 text-xs text-ink leading-relaxed'>
                  "{rev.comment}"
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between border-t border-hairline px-4 py-3 bg-panel-subtle text-xs rounded-xl'>
          <span className='text-ink-subtle'>
            Page {page} of {totalPages}
          </span>
          <div className='flex items-center gap-2'>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className='rounded border border-hairline bg-panel px-2.5 py-1 text-xs font-semibold disabled:opacity-40'
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className='rounded border border-hairline bg-panel px-2.5 py-1 text-xs font-semibold disabled:opacity-40'
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
