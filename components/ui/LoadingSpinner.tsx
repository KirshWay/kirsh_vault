import React from 'react';

type Props = {
  message?: string;
};

export function LoadingSpinner({ message = 'Loading...' }: Props) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
