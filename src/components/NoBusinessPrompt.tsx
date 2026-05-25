import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import CreateBusinessModal from '@/components/CreateBusinessModal.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useState } from 'react';

interface NoBusinessPromptProps {
  title?: string;
  message?: string;
}

export default function NoBusinessPrompt({ 
  title = 'No business selected', 
  message = 'Create or select a business to access this feature.' 
}: NoBusinessPromptProps) {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const [showModal, setShowModal] = useState(false);

  if (activeBusiness) return null;

  return (
    <>
      <div className='flex flex-col items-center justify-center py-32 animate-fade-in'>
        <div className='relative mb-8'>
          <div className='absolute inset-0 rounded-2xl bg-primary-200 blur-2xl opacity-40 animate-pulse-soft' />
          <div className='relative rounded-2xl bg-gradient-to-br from-primary-50 to-white p-8 border border-primary-100 shadow-sm animate-float'>
            <Plus className='h-10 w-10 text-primary-400' />
          </div>
        </div>
        <p className='text-xl font-bold text-gray-900'>{title}</p>
        <p className='text-sm text-gray-400 mt-2 mb-8 text-center max-w-sm'>
          {message}
        </p>
        <Button onClick={() => setShowModal(true)}>Create Business</Button>
      </div>
      <CreateBusinessModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        required
      />
    </>
  );
}