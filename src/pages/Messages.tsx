import { useEffect, useState } from 'react';
import {
  Mail,
  Search,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useMessageStore } from '@/stores/message.store.ts';
import Button from '@/components/ui/Button.tsx';
import EmptyState from '@/components/ui/EmptyState.tsx';
import Card from '@/components/ui/Card.tsx';
import type { UserMessage } from '@/types/index.ts';

type FilterTab = 'all' | 'unread';

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Messages() {
  const messages = useMessageStore((s) => s.messages);
  const pagination = useMessageStore((s) => s.pagination);
  const unreadCount = useMessageStore((s) => s.unreadCount);
  const loading = useMessageStore((s) => s.loading);
  const fetch = useMessageStore((s) => s.fetch);
  const fetchUnreadCount = useMessageStore((s) => s.fetchUnreadCount);
  const markRead = useMessageStore((s) => s.markRead);
  const markAllRead = useMessageStore((s) => s.markAllRead);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch messages when tab, page, or search changes
  useEffect(() => {
    fetch({
      page,
      limit: 15,
      unread: activeTab === 'unread' ? true : undefined,
      search: debouncedSearch || undefined,
    });
    fetchUnreadCount();
  }, [activeTab, page, debouncedSearch, fetch, fetchUnreadCount]);

  const handleToggleExpand = async (message: UserMessage) => {
    if (expandedId === message.id) {
      setExpandedId(null);
    } else {
      setExpandedId(message.id);
      if (!message.isRead) {
        await markRead(message.id);
      }
    }
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  return (
    <div className='mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6'>
      {/* Page Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5'>
        <div>
          <div className='flex items-center gap-2.5'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-gray-900'>
              Inbox
            </h1>
            <span className='inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 border border-primary-100'>
              <Sparkles className='h-3 w-3' />
              WallX Announcements
            </span>
          </div>
          <p className='text-xs sm:text-sm text-gray-500 mt-1'>
            Platform announcements, tax deadline notices, and direct updates from the WallX team.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant='outline'
            size='sm'
            onClick={handleMarkAll}
            className='self-start sm:self-auto inline-flex items-center gap-1.5'
          >
            <CheckCheck className='h-4 w-4 text-primary-600' />
            <span>Mark all read</span>
          </Button>
        )}
      </div>

      {/* Tabs and Search Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-1.5'>
          <button
            type='button'
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Messages
          </button>

          <button
            type='button'
            onClick={() => {
              setActiveTab('unread');
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'unread'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === 'unread'
                    ? 'bg-white/20 text-white'
                    : 'bg-primary-100 text-primary-700'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className='relative w-full sm:w-72'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400' />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search messages...'
            className='w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none transition-colors'
          />
        </div>
      </div>

      {/* Message List */}
      <div className='space-y-2.5'>
        {loading && messages.length === 0 ? (
          <Card className='py-12 text-center'>
            <p className='text-xs text-gray-400'>Loading your inbox messages...</p>
          </Card>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={Mail}
            message={
              activeTab === 'unread'
                ? 'You have caught up with all messages! No unread notifications.'
                : 'Your inbox is currently empty. Platform announcements will appear here.'
            }
          />
        ) : (
          messages.map((m) => {
            const isExpanded = expandedId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => handleToggleExpand(m)}
                className={`cursor-pointer rounded-xl border transition-all duration-150 ${
                  !m.isRead
                    ? 'border-primary-200 bg-primary-50/20 shadow-xs hover:border-primary-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className='p-4 sm:p-5'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-start gap-3 min-w-0'>
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                          !m.isRead ? 'bg-primary-600' : 'bg-transparent'
                        }`}
                        aria-hidden='true'
                      />

                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-baseline gap-2'>
                          <h2
                            className={`text-sm ${
                              !m.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                            }`}
                          >
                            {m.title}
                          </h2>
                        </div>

                        <div
                          className={`mt-1.5 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap ${
                            !isExpanded ? 'line-clamp-2' : ''
                          }`}
                        >
                          {m.body}
                        </div>

                        <div className='mt-2.5 flex items-center gap-3 text-[11px] text-gray-400'>
                          <span className='inline-flex items-center gap-1'>
                            <Clock className='h-3 w-3' />
                            {formatStamp(m.createdAt)}
                          </span>
                          {!m.isRead && (
                            <span className='font-semibold text-primary-600'>New</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type='button'
                      aria-label={isExpanded ? 'Collapse message' : 'Expand message'}
                      className='shrink-0 p-1 text-gray-400 hover:text-gray-600'
                    >
                      {isExpanded ? (
                        <ChevronUp className='h-4 w-4' />
                      ) : (
                        <ChevronDown className='h-4 w-4' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-between border-t border-gray-200 pt-4 text-xs text-gray-500'>
          <span>
            Page <strong className='font-semibold text-gray-900'>{pagination.page}</strong> of{' '}
            <strong className='font-semibold text-gray-900'>{pagination.totalPages}</strong> ·{' '}
            {pagination.total} messages
          </span>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label='Previous page'
            >
              <ChevronLeft className='h-3.5 w-3.5' />
              <span className='hidden sm:inline ml-1'>Previous</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
              aria-label='Next page'
            >
              <span className='hidden sm:inline mr-1'>Next</span>
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
