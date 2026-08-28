import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/** Friendly landing page for stale bookmarks and mistyped local routes. */
export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const canReturnInApp = typeof window.history.state?.idx === 'number' && window.history.state.idx > 0;

  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-border-light bg-surface-light-elevated p-8 text-center dark:border-border-dark dark:bg-surface-dark-elevated">
        <p className="text-sm font-medium text-accent-primary">页面未找到</p>
        <h2 className="mt-2 text-2xl font-semibold text-text-light-primary dark:text-text-dark-primary">
          这个地址可能已经移动
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-light-secondary dark:text-text-dark-secondary">
          你的本地数据没有受到影响。可以返回上一页，或从首页重新进入需要的工作区。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => canReturnInApp ? navigate(-1) : navigate('/')}
            className="inline-flex items-center gap-2 rounded-button border border-border-light px-4 py-2 text-sm font-medium text-text-light-primary transition-colors hover:bg-surface-light dark:border-border-dark dark:text-text-dark-primary dark:hover:bg-surface-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            {canReturnInApp ? '返回上一页' : '返回首页'}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-button bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            回到首页
          </Link>
        </div>
      </section>
    </div>
  );
};

export default NotFound;
