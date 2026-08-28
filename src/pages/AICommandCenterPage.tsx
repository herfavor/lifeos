import React from 'react';
import { AICommandCenter } from '../components/AI/AICommandCenter';

/** Canonical full-page home for all conversational AI management. */
export const AICommandCenterPage: React.FC = () => (
  <div className="mx-auto flex h-full min-h-0 w-full max-w-[1280px] flex-1 flex-col py-4 md:py-5">
    <AICommandCenter />
  </div>
);

export default AICommandCenterPage;
