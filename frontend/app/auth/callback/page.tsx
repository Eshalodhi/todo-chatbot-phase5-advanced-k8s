'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { CheckCircle, Loader2 } from 'lucide-react';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = searchParams.get('token');
    const provider = searchParams.get('provider');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (token) {
      handleOAuthCallback(token).catch((err) => {
        setError('Failed to complete sign in. Please try again.');
      });
    } else {
      setError('No authentication token received.');
    }
  }, [searchParams, handleOAuthCallback]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <span className="text-error-600 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Authentication Failed
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            Return to sign in
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Completing sign in...
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Please wait</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </React.Suspense>
  );
}
