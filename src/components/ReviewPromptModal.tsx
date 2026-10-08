import { useState } from 'react';
import { Star, X, Sparkles, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/axios.ts';
import { useReviewPrompt } from '@/hooks/useReviewPrompt.ts';

const SENTIMENT_CHIPS = [
  '⚡ Super Fast',
  '🧾 Clean Invoices',
  '🇳🇬 Smooth Tax Filings',
  '💳 Virtual Store Cards',
  '📊 Clear Reports',
  '🤝 Easy Setup',
];

const STAR_REACTIONS: Record<number, string> = {
  5: 'Oshey! Top notch! 🔥 What do you love most?',
  4: 'Nice one! 🚀 What can we add to make it a solid 5/5?',
  3: 'Fair enough! 👍 What feature is missing for you?',
  2: 'Not quite there yet? 🛠️ Where can we do better?',
  1: 'E get as e be? 😕 Tell us what went wrong so we can fix it sharp-sharp!',
};

export default function ReviewPromptModal() {
  const { isOpen, dismiss, markSubmitted } = useReviewPrompt();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/feedback', {
        rating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      });

      markSubmitted();
      toast.success(
        "Thank you, Boss! You're helping us build the best ERP for Nigerian businesses 🇳🇬",
        { duration: 5000 },
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit feedback. Try again later.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='review-prompt-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200'
    >
      <div className='relative w-full max-w-lg rounded-3xl bg-panel border border-hairline p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200'>
        {/* Close Button */}
        <button
          onClick={dismiss}
          aria-label='Dismiss review prompt'
          className='absolute right-5 top-5 rounded-full p-1.5 text-ink-subtle hover:bg-panel-subtle hover:text-ink transition-colors'
        >
          <X className='h-4 w-4' />
        </button>

        {/* Header with Warm Nigerian Micro-copy */}
        <div className='text-center space-y-1.5 pt-1'>
          <div className='inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200/80 px-3 py-1 text-xs font-bold text-primary-800 shadow-2xs'>
            <Sparkles className='h-3.5 w-3.5 text-primary-600' />
            <span>Quick 10-Second Check-In</span>
          </div>

          <h2
            id='review-prompt-title'
            className='text-xl sm:text-2xl font-extrabold tracking-tight text-ink'
          >
            How is your experience, Boss? 🙌
          </h2>

          <p className='text-xs sm:text-sm text-ink-muted max-w-md mx-auto'>
            You’ve spent your first few minutes checking out WallXERP. How is the speed and feel so far?
          </p>
        </div>

        {/* 5-Star Interactive Rating */}
        <div className='flex flex-col items-center justify-center space-y-2 py-2'>
          <div className='flex items-center gap-2'>
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= activeRating;
              return (
                <button
                  key={star}
                  type='button'
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className='p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    className={`h-8 w-8 sm:h-9 sm:w-9 transition-colors ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-gray-300 hover:text-amber-200'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Dynamic Reaction Micro-copy */}
          <p className='text-xs sm:text-sm font-semibold text-primary-700 min-h-[20px] text-center transition-all animate-in fade-in duration-150'>
            {STAR_REACTIONS[activeRating] || STAR_REACTIONS[5]}
          </p>
        </div>

        {/* 1-Tap Sentiment Chips */}
        <div className='space-y-2'>
          <label className='block text-center text-xs font-semibold text-ink-muted uppercase tracking-wider'>
            Tap what applies to your experience:
          </label>

          <div className='flex flex-wrap items-center justify-center gap-2'>
            {SENTIMENT_CHIPS.map((chip) => {
              const isSelected = selectedTags.includes(chip);
              return (
                <button
                  key={chip}
                  type='button'
                  onClick={() => toggleTag(chip)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-xs scale-105 border border-primary-600'
                      : 'bg-panel-subtle text-ink-muted border border-hairline hover:bg-panel hover:text-ink'
                  }`}
                >
                  {isSelected && <Check className='h-3 w-3 stroke-[3]' />}
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Comment Input */}
        <div>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder='Any feature you need next or feedback for the team? (Optional)'
            className='w-full p-3 text-xs rounded-xl border border-hairline bg-panel text-ink placeholder:text-ink-subtle focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          />
        </div>

        {/* Actions Bar */}
        <div className='space-y-2 pt-1'>
          <button
            type='button'
            disabled={submitting}
            onClick={handleSubmit}
            className='w-full py-3 px-6 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50'
          >
            {submitting ? (
              <span className='inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
            ) : (
              <>
                <Send className='h-4 w-4' />
                <span>Send My Feedback</span>
              </>
            )}
          </button>

          <div className='flex items-center justify-center pt-1'>
            <button
              type='button'
              onClick={dismiss}
              className='text-[11px] font-semibold text-ink-subtle hover:text-ink underline transition-colors'
            >
              Remind me in a week
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
