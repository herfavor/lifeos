/**
 * Form Responses Page
 * View and analyze form responses with table view and CSV export
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoreErrorBoundary } from '../components/StoreErrorBoundary';
import { useFormsStore } from '../stores/useFormsStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportFormResponsesToCSV } from '../utils/formExport';
import { calculateFormAnalytics } from '../services/formAnalytics';
import { ArrowLeft, Download, Trash2, Plus, AlertTriangle, BarChart3 } from 'lucide-react';
import { toast } from '../stores/useToastStore';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FormResponses() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const getForm = useFormsStore((s) => s.getForm);
  const getResponses = useFormsStore((s) => s.getResponses);
  const deleteResponse = useFormsStore((s) => s.deleteResponse);
  const clearFormResponses = useFormsStore((s) => s.clearFormResponses);

  const [form, setForm] = useState(id ? getForm(id) : null);
  const [responses, setResponses] = useState(id ? getResponses(id) : []);
  const [activeTab, setActiveTab] = useState<'responses' | 'analytics'>('responses');
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/forms');
      return;
    }

    const foundForm = getForm(id);
    if (!foundForm) {
      navigate('/forms');
      return;
    }

    setForm(foundForm);
    setResponses(getResponses(id));
  }, [id, getForm, getResponses, navigate]);

  if (!form || !id) return null;

  const handleExport = () => {
    if (responses.length === 0) {
      toast.warning('没有可导出的回复');
      return;
    }
    exportFormResponsesToCSV(form, responses);
  };

  const handleDeleteResponse = (responseId: string) => {
    setResponseToDelete(responseId);
  };

  const confirmDeleteResponse = () => {
    if (responseToDelete && id) {
      deleteResponse(responseToDelete);
      setResponses(getResponses(id));
      setResponseToDelete(null);
    }
  };

  const handleClearAll = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAll = () => {
    if (id) {
      clearFormResponses(id);
      setResponses([]);
      setShowClearAllConfirm(false);
    }
  };

  // Sort fields by order for consistent column display
  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  // Sort responses by most recent first
  const sortedResponses = [...responses].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  // Calculate analytics
  const analytics =
    form && responses.length > 0 ? calculateFormAnalytics(form, responses) : null;

  // Chart colors (using semantic tokens)
  const CHART_COLORS = ['#FF006E', '#8338EC', '#3A86FF', '#06FFA5', '#FFBE0B'];

  return (
    <StoreErrorBoundary storeName="forms">
      <div className="flex flex-col h-screen bg-surface-light dark:bg-surface-dark">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/forms')}
              className="p-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-lg transition-colors"
              aria-label="返回表单"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                {form.title} - 回复
              </h1>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {responses.length} 条回复
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/forms/${id}/fill`)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg hover:bg-border-light dark:hover:bg-border-dark"
            >
              <Plus className="w-4 h-4" />
              新建回复
            </button>
            {responses.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90"
                >
                  <Download className="w-4 h-4" />
                  导出 CSV
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 text-accent-red rounded-lg hover:bg-accent-red/20"
                >
                  <Trash2 className="w-4 h-4" />
                  清除全部
                </button>
              </>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex gap-1 px-4">
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'responses'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
              }`}
            >
              回复
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              数据分析
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'responses' && (
            <>
              {responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 mb-4 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center">
                <Plus className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary" />
              </div>
              <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                暂无回复
              </h2>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md">
                填写表单即可开始收集数据
              </p>
              <button
                onClick={() => navigate(`/forms/${id}/fill`)}
                className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg hover:opacity-90"
              >
                <Plus className="w-5 h-5" />
                填写表单
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedResponses.map((response) => (
                <div
                  key={response.id}
                  className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4"
                >
                  {/* Response Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        提交于：{new Date(response.submittedAt).toLocaleString()}
                      </div>
                      {response.isSpam && (
                        <div
                          className="flex items-center gap-1 px-2 py-1 bg-accent-yellow/10 text-accent-yellow rounded text-xs font-medium"
                          title={`可疑回复（${
                            response.submissionTimeSeconds !== undefined
                              ? `在 ${response.submissionTimeSeconds.toFixed(1)} 秒内提交`
                              : '触发蜜罐'
                          }）`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          垃圾回复
                        </div>
                      )}
                      {response.submissionTimeSeconds !== undefined && !response.isSpam && (
                        <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                          {response.submissionTimeSeconds.toFixed(1)}秒
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteResponse(response.id)}
                      className="p-2 hover:bg-accent-red/10 text-accent-red rounded"
                      title="删除回复"
                      aria-label="删除回复"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Response Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedFields.map((field) => {
                      const value = response.answers[field.id];
                      const displayValue = formatValue(value, field.type);

                      return (
                        <div key={field.id}>
                          <div className="text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                            {field.label}
                          </div>
                          <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <>
              {!analytics || responses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BarChart3 className="w-16 h-16 text-text-light-tertiary dark:text-text-dark-tertiary mb-4" />
                  <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                    暂无数据可分析
                  </h2>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md">
                    有表单回复后即可查看数据分析
                  </p>
                </div>
              ) : (
                <div className="max-w-6xl mx-auto space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
                      <div className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                        回复总数
                      </div>
                      <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                        {analytics.totalResponses}
                      </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
                      <div className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                        有效回复
                      </div>
                      <div className="text-2xl font-bold text-accent-green">
                        {analytics.nonSpamResponses}
                      </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
                      <div className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                        垃圾率
                      </div>
                      <div className="text-2xl font-bold text-accent-yellow">
                        {analytics.spamRate.toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
                      <div className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                        平均用时
                      </div>
                      <div className="text-2xl font-bold text-accent-primary">
                        {analytics.avgCompletionTimeSeconds.toFixed(1)}秒
                      </div>
                    </div>
                  </div>

                  {/* Responses Over Time */}
                  {analytics.responsesByDay.length > 0 && (
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
                        回复趋势
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.responsesByDay}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border-light dark:stroke-border-dark" />
                          <XAxis dataKey="date" className="stroke-text-light-tertiary dark:stroke-text-dark-tertiary" />
                          <YAxis className="stroke-text-light-tertiary dark:stroke-text-dark-tertiary" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--surface-dark)',
                              border: '1px solid var(--border-dark)',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="count" fill="var(--accent-purple)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Field Analytics */}
                  {analytics.fieldAnalytics.map((field) => (
                    <div
                      key={field.fieldId}
                      className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6"
                    >
                      <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        {field.fieldLabel}
                      </h3>
                      <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mb-4">
                        {field.responseCount} 条回复
                      </p>

                      {/* Average value for numeric fields */}
                      {field.averageValue !== undefined && (
                        <div className="mb-4">
                          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            平均值：
                          </span>
                          <span className="ml-2 text-lg font-bold text-accent-primary">
                            {field.averageValue.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Distribution chart for select/radio/rating */}
                      {field.distribution && field.distribution.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={field.distribution}
                              dataKey="count"
                              nameKey="value"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label
                            >
                              {field.distribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}

                      {/* Top answers for select/radio */}
                      {field.mostCommonAnswers && field.mostCommonAnswers.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                            最常见的回答：
                          </h4>
                          <div className="space-y-2">
                            {field.mostCommonAnswers.map((answer, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                                  {answer.value}
                                </span>
                                <span className="text-sm font-medium text-accent-primary">
                                  {answer.count} 条回复
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <ConfirmDialog
          isOpen={responseToDelete !== null}
          onClose={() => setResponseToDelete(null)}
          onConfirm={confirmDeleteResponse}
          title="删除回复"
          message="确定删除这条回复？"
          confirmText="删除"
          variant="danger"
        />

        <ConfirmDialog
          isOpen={showClearAllConfirm}
          onClose={() => setShowClearAllConfirm(false)}
          onConfirm={confirmClearAll}
          title="清除全部回复"
          message={`确定删除全部 ${responses.length} 条回复？此操作无法撤销。`}
          confirmText="清除全部"
          variant="danger"
        />
      </div>
    </StoreErrorBoundary>
  );
}

// Helper function to format values for display
function formatValue(value: any, fieldType: string): string {
  if (value === null || value === undefined || value === '') {
    return '（空）';
  }

  switch (fieldType) {
    case 'checkbox':
      return value ? '是' : '否';

    case 'multiselect':
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : '（未选择）';
      }
      return String(value);

    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : String(value);

    case 'rating':
      return `${value} / 5 ★`;

    case 'scale':
      return `${value} / 10`;

    case 'number':
      return String(value);

    default:
      return String(value);
  }
}
