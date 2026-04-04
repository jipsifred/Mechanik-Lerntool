import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ArrowUpFromLine, ChevronDown, ChevronRight, FolderPlus, ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { GlassButton, GlassContainer } from '../ui';
import { CUSTOM_TASK_TEMPLATE } from '../../data/customTasks';
import type { CustomTaskCategory, TaskListItem } from '../../types';

interface CustomTaskManagerProps {
  categories: CustomTaskCategory[];
  tasks: TaskListItem[];
  collapsedSubs: Set<string>;
  loading?: boolean;
  getTaskCheckState: (taskId: number) => 'none' | 'green' | 'yellow';
  onToggleSub: (code: string) => void;
  onToggleTaskCheck: (taskId: number) => void;
  onNavigateToTask: (taskId: number, category: string | null, tab?: number) => void;
  onCreateCategory: (title: string, description: string) => Promise<CustomTaskCategory>;
  onUpdateCategory: (categoryId: number, title: string, description: string) => Promise<CustomTaskCategory>;
  onDeleteCategory: (categoryId: number) => Promise<void>;
  onCreateTask: (categoryId: number, taskJson: string, imageDataUrl: string | null) => Promise<{ id: number; category: string }>;
  onLoadTaskForEdit: (taskId: number) => Promise<{
    id: number;
    category_id: number;
    category_code: string;
    task_json: string;
    image_data_url: string | null;
  }>;
  onUpdateTask: (taskId: number, categoryId: number, taskJson: string, imageDataUrl: string | null) => Promise<{ id: number; category: string }>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

interface RoundActionButtonProps {
  onClick: () => void;
  title: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

function inputClassName() {
  return 'w-full rounded-2xl border border-white/70 bg-white/55 px-3 py-2 text-body text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white/75';
}

function iconButtonClassName() {
  return 'active:scale-95';
}

function rowIconButtonClassName(danger = false) {
  return `shrink-0 p-2 -m-2 flex items-center justify-center transition-colors disabled:opacity-50 ${danger ? 'text-slate-300 hover:text-rose-500' : 'text-slate-400 hover:text-slate-600'}`;
}

function RoundActionButton({ onClick, title, children, disabled = false, className = '' }: RoundActionButtonProps) {
  return (
    <GlassContainer className="h-10 w-10 justify-center shrink-0">
      <GlassButton
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`${iconButtonClassName()} ${className}`.trim()}
      >
        {children}
      </GlassButton>
    </GlassContainer>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

export function CustomTaskManager({
  categories,
  tasks,
  collapsedSubs,
  loading = false,
  getTaskCheckState,
  onToggleSub,
  onToggleTaskCheck,
  onNavigateToTask,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateTask,
  onLoadTaskForEdit,
  onUpdateTask,
  onDeleteTask,
}: CustomTaskManagerProps) {
  const tasksByCategory = useMemo(() => {
    const map = new Map<string, TaskListItem[]>();
    categories.forEach((category) => {
      map.set(category.code, tasks.filter((task) => task.category === category.code));
    });
    return map;
  }, [categories, tasks]);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeletingId, setCategoryDeletingId] = useState<number | null>(null);
  const [categoryError, setCategoryError] = useState('');

  const [openTaskCategoryId, setOpenTaskCategoryId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [taskJson, setTaskJson] = useState(CUSTOM_TASK_TEMPLATE);
  const [taskImageDataUrl, setTaskImageDataUrl] = useState<string | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskDeletingId, setTaskDeletingId] = useState<number | null>(null);
  const [taskError, setTaskError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    setCategoryTitle('');
    setCategoryDescription('');
    setCategoryError('');
  };

  const resetTaskForm = () => {
    setOpenTaskCategoryId(null);
    setEditingTaskId(null);
    setTaskFormLoading(false);
    setTaskJson(CUSTOM_TASK_TEMPLATE);
    setTaskImageDataUrl(null);
    setTaskError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreateCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryTitle('');
    setCategoryDescription('');
    setCategoryError('');
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: CustomTaskCategory) => {
    setEditingCategoryId(category.id);
    setCategoryTitle(category.titel);
    setCategoryDescription(category.beschreibung);
    setCategoryError('');
    setShowCategoryForm(true);
  };

  const handleSubmitCategory = async () => {
    if (!categoryTitle.trim()) {
      setCategoryError('Name fehlt.');
      return;
    }

    setCategorySaving(true);
    setCategoryError('');
    try {
      if (editingCategoryId !== null) {
        await onUpdateCategory(editingCategoryId, categoryTitle.trim(), categoryDescription.trim());
      } else {
        await onCreateCategory(categoryTitle.trim(), categoryDescription.trim());
      }
      resetCategoryForm();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Kategorie konnte nicht gespeichert werden.');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (category: CustomTaskCategory, taskCount: number) => {
    const confirmed = window.confirm(
      taskCount > 0 ? 'Unterkategorie und Aufgaben wirklich löschen?' : 'Unterkategorie wirklich löschen?'
    );
    if (!confirmed) return;

    setCategoryDeletingId(category.id);
    setCategoryError('');
    try {
      await onDeleteCategory(category.id);
      if (editingCategoryId === category.id) resetCategoryForm();
      if (openTaskCategoryId === category.id) resetTaskForm();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Kategorie konnte nicht gelöscht werden.');
      setShowCategoryForm(true);
    } finally {
      setCategoryDeletingId(null);
    }
  };

  const handleOpenTaskForm = (categoryId: number) => {
    setEditingTaskId(null);
    setOpenTaskCategoryId((prev) => prev === categoryId ? null : categoryId);
    setTaskError('');
    setTaskJson(CUSTOM_TASK_TEMPLATE);
    setTaskImageDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditTask = async (taskId: number, categoryId: number) => {
    setTaskFormLoading(true);
    setTaskError('');
    try {
      const task = await onLoadTaskForEdit(taskId);
      setEditingTaskId(taskId);
      setOpenTaskCategoryId(categoryId);
      setTaskJson(task.task_json);
      setTaskImageDataUrl(task.image_data_url);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht geladen werden.');
    } finally {
      setTaskFormLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const confirmed = window.confirm('Aufgabe wirklich löschen?');
    if (!confirmed) return;

    setTaskDeletingId(taskId);
    setTaskError('');
    try {
      await onDeleteTask(taskId);
      if (editingTaskId === taskId) resetTaskForm();
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht gelöscht werden.');
    } finally {
      setTaskDeletingId(null);
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setTaskImageDataUrl(dataUrl);
      setTaskError('');
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Bild konnte nicht geladen werden.');
    }
  };

  const handleSubmitTask = async (categoryId: number) => {
    if (!taskJson.trim()) {
      setTaskError('JSON fehlt.');
      return;
    }

    setTaskSaving(true);
    setTaskError('');
    try {
      if (editingTaskId !== null) {
        await onUpdateTask(editingTaskId, categoryId, taskJson, taskImageDataUrl);
      } else {
        await onCreateTask(categoryId, taskJson, taskImageDataUrl);
      }
      resetTaskForm();
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht gespeichert werden.');
    } finally {
      setTaskSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-4 px-2 pb-8">
      <div className="flex items-center justify-end pt-1">
        {!showCategoryForm && (
          <RoundActionButton onClick={openCreateCategoryForm} title="Unterkategorie hinzufügen">
            <FolderPlus size={16} />
          </RoundActionButton>
        )}
      </div>

      {showCategoryForm && (
        <div className="glass-panel-soft panel-radius border border-white/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-heading font-medium text-slate-800">
              {editingCategoryId !== null ? 'Unterkategorie' : 'Neu'}
            </h3>
            <div className="flex items-center gap-2">
              <RoundActionButton
                onClick={handleSubmitCategory}
                disabled={categorySaving}
                title={editingCategoryId !== null ? 'Unterkategorie speichern' : 'Unterkategorie anlegen'}
              >
                <Save size={16} />
              </RoundActionButton>
              <RoundActionButton onClick={resetCategoryForm} title="Schließen">
                <X size={16} />
              </RoundActionButton>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3">
            <input
              value={categoryTitle}
              onChange={(event) => setCategoryTitle(event.target.value)}
              placeholder="Name"
              className={inputClassName()}
            />
            <input
              value={categoryDescription}
              onChange={(event) => setCategoryDescription(event.target.value)}
              placeholder="Kurzbeschreibung"
              className={inputClassName()}
            />
          </div>

          {categoryError && (
            <div className="px-1 text-label text-rose-500">{categoryError}</div>
          )}
        </div>
      )}

      {loading ? (
        <div className="glass-panel-soft panel-radius flex min-h-[200px] items-center justify-center p-6">
          <span className="text-body text-slate-400">Laden...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-panel-soft panel-radius flex min-h-[180px] items-center justify-center p-6">
          <p className="text-body text-slate-400">Keine Unterkategorie</p>
        </div>
      ) : (
        categories.map((category) => {
          const categoryTasks = tasksByCategory.get(category.code) ?? [];
          const isTaskFormOpen = openTaskCategoryId === category.id;

          return (
            <div key={category.id} className="space-y-2">
              <div className="flex w-full items-center gap-2 px-1">
                <button
                  onClick={() => onToggleSub(category.code)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                >
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${collapsedSubs.has(category.code) ? '-rotate-90' : ''}`}
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-title font-medium text-slate-700">{category.titel}</span>
                    {category.beschreibung && (
                      <span className="block truncate text-label text-slate-400">{category.beschreibung}</span>
                    )}
                  </div>
                </button>

                <span className="min-w-6 shrink-0 text-right text-label font-medium tabular-nums text-slate-400">
                  {categoryTasks.length}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <RoundActionButton onClick={() => handleOpenTaskForm(category.id)} title="Aufgabe hinzufügen">
                    <Plus size={16} />
                  </RoundActionButton>
                  <RoundActionButton onClick={() => handleEditCategory(category)} title="Unterkategorie umbenennen">
                    <Pencil size={15} />
                  </RoundActionButton>
                  <RoundActionButton
                    onClick={() => handleDeleteCategory(category, categoryTasks.length)}
                    title="Unterkategorie löschen"
                    disabled={categoryDeletingId === category.id}
                    className="text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </RoundActionButton>
                </div>
              </div>

              {!collapsedSubs.has(category.code) && (
                <div className="space-y-2">
                  {isTaskFormOpen && (
                    <div className="glass-panel-soft panel-radius border border-white/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="min-w-0 truncate text-heading font-medium text-slate-800">
                          {editingTaskId !== null ? 'Bearbeiten' : category.titel}
                        </h3>
                        <div className="flex items-center gap-2">
                          <RoundActionButton
                            onClick={() => setTaskJson(CUSTOM_TASK_TEMPLATE)}
                            title="Vorlage einfügen"
                            disabled={taskFormLoading}
                          >
                            <ArrowUpFromLine size={16} />
                          </RoundActionButton>
                          <RoundActionButton
                            onClick={() => fileInputRef.current?.click()}
                            title="Bild hochladen"
                            disabled={taskFormLoading}
                            className={taskImageDataUrl ? 'text-emerald-600' : ''}
                          >
                            <ImagePlus size={16} />
                          </RoundActionButton>
                          <RoundActionButton
                            onClick={() => handleSubmitTask(category.id)}
                            title={editingTaskId !== null ? 'Aufgabe speichern' : 'Aufgabe anlegen'}
                            disabled={taskSaving || taskFormLoading}
                          >
                            <Save size={16} />
                          </RoundActionButton>
                          <RoundActionButton onClick={resetTaskForm} title="Schließen">
                            <X size={16} />
                          </RoundActionButton>
                        </div>
                      </div>

                      {taskFormLoading ? (
                        <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-white/70 bg-white/45 text-body text-slate-400">
                          Lädt...
                        </div>
                      ) : (
                        <textarea
                          value={taskJson}
                          onChange={(event) => setTaskJson(event.target.value)}
                          spellCheck={false}
                          className="min-h-[320px] w-full rounded-3xl border border-white/70 bg-white/55 px-4 py-3 font-mono text-[12px] leading-5 text-slate-700 outline-none transition-colors focus:border-slate-300 focus:bg-white/75"
                        />
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />

                      {taskImageDataUrl && (
                        <div className="relative rounded-3xl border border-white/70 bg-white/45 p-2">
                          <div className="absolute right-4 top-4">
                            <RoundActionButton
                              onClick={() => {
                                setTaskImageDataUrl(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              title="Bild entfernen"
                            >
                              <X size={16} />
                            </RoundActionButton>
                          </div>
                          <img src={taskImageDataUrl} alt="Vorschau" className="max-h-48 w-full rounded-2xl object-contain" />
                        </div>
                      )}

                      {taskError && (
                        <div className="px-1 text-label text-rose-500">{taskError}</div>
                      )}
                    </div>
                  )}

                  {categoryTasks.length === 0 ? (
                    <div className="rounded-xl border border-white/60 bg-white/35 px-4 py-3 text-body text-slate-400">
                      Leer
                    </div>
                  ) : (
                    categoryTasks.map((task) => {
                      const state = getTaskCheckState(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => onNavigateToTask(task.id, category.code)}
                          className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/60 bg-white/40 px-3 transition-all duration-200 hover:bg-white/60 hover:shadow-sm"
                        >
                          <span className="flex-1 truncate text-body text-slate-700">{task.title}</span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditTask(task.id, category.id);
                            }}
                            title="Aufgabe bearbeiten"
                            className={rowIconButtonClassName()}
                            disabled={taskDeletingId === task.id}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            title="Aufgabe löschen"
                            className={rowIconButtonClassName(true)}
                            disabled={taskDeletingId === task.id}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleTaskCheck(task.id);
                            }}
                            title={state === 'none' ? 'Als erledigt markieren' : state === 'green' ? 'Korrekt gelöst' : 'Teilweise bearbeitet'}
                            className="shrink-0 p-2 -m-2 flex items-center justify-center"
                          >
                            <span className={`led-dot ${state === 'green' ? 'led-dot-green' : state === 'yellow' ? 'led-dot-yellow' : 'led-dot-none'}`} />
                          </button>
                          <ChevronRight size={14} className="shrink-0 text-slate-300" />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
