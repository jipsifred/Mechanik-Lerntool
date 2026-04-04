import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowUpFromLine, ChevronDown, ChevronRight, FolderPlus, ImagePlus, Pencil, Plus, Save, X } from 'lucide-react';
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
  onCreateTask: (categoryId: number, taskJson: string, imageDataUrl: string | null) => Promise<{ id: number; category: string }>;
  onLoadTaskForEdit: (taskId: number) => Promise<{
    id: number;
    category_id: number;
    category_code: string;
    task_json: string;
    image_data_url: string | null;
  }>;
  onUpdateTask: (taskId: number, categoryId: number, taskJson: string, imageDataUrl: string | null) => Promise<{ id: number; category: string }>;
}

function inputClassName() {
  return 'w-full rounded-2xl border border-white/70 bg-white/55 px-3 py-2 text-body text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white/75';
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
  onCreateTask,
  onLoadTaskForEdit,
  onUpdateTask,
}: CustomTaskManagerProps) {
  const tasksByCategory = useMemo(() => {
    const map = new Map<string, TaskListItem[]>();
    categories.forEach((category) => {
      map.set(category.code, tasks.filter((task) => task.category === category.code));
    });
    return map;
  }, [categories, tasks]);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  const [openTaskCategoryId, setOpenTaskCategoryId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [taskJson, setTaskJson] = useState(CUSTOM_TASK_TEMPLATE);
  const [taskImageDataUrl, setTaskImageDataUrl] = useState<string | null>(null);
  const [taskImageName, setTaskImageName] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetTaskForm = () => {
    setOpenTaskCategoryId(null);
    setEditingTaskId(null);
    setTaskFormLoading(false);
    setTaskJson(CUSTOM_TASK_TEMPLATE);
    setTaskImageDataUrl(null);
    setTaskImageName('');
    setTaskError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateCategory = async () => {
    if (!categoryTitle.trim()) {
      setCategoryError('Name fehlt.');
      return;
    }

    setCategorySaving(true);
    setCategoryError('');
    try {
      await onCreateCategory(categoryTitle.trim(), categoryDescription.trim());
      setCategoryTitle('');
      setCategoryDescription('');
      setShowCategoryForm(false);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Kategorie konnte nicht gespeichert werden.');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleOpenTaskForm = (categoryId: number) => {
    setEditingTaskId(null);
    setOpenTaskCategoryId((prev) => prev === categoryId ? null : categoryId);
    setTaskError('');
    setTaskJson(CUSTOM_TASK_TEMPLATE);
    setTaskImageDataUrl(null);
    setTaskImageName('');
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
      setTaskImageName(task.image_data_url ? 'Bild gespeichert' : '');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht geladen werden.');
    } finally {
      setTaskFormLoading(false);
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setTaskImageDataUrl(dataUrl);
      setTaskImageName(file.name);
      setTaskError('');
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Bild konnte nicht geladen werden.');
    }
  };

  const handleCreateTask = async (categoryId: number) => {
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
      <div className="flex items-center justify-end gap-2 pt-1">
        {!showCategoryForm && (
          <GlassContainer className="h-10 w-10 justify-center">
            <GlassButton onClick={() => setShowCategoryForm(true)} className="active:scale-95" title="Kategorie hinzufügen">
              <FolderPlus size={16} />
            </GlassButton>
          </GlassContainer>
        )}
      </div>

      {showCategoryForm && (
        <div className="glass-panel-soft panel-radius border border-white/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-heading font-medium text-slate-800">Neue Unterkategorie</h3>
            </div>
            <GlassContainer className="h-10 w-10 justify-center shrink-0">
              <GlassButton
                onClick={() => {
                  setShowCategoryForm(false);
                  setCategoryError('');
                }}
                title="Schließen"
                className="active:scale-95"
              >
                <X size={16} />
              </GlassButton>
            </GlassContainer>
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
          <div className="flex items-center justify-between gap-3">
            <span className={`text-label ${categoryError ? 'text-rose-500' : 'text-slate-400'}`}>
              {categoryError || ' '}
            </span>
            <GlassContainer className="h-10 gap-1.5 px-2.5">
              <GlassButton onClick={handleCreateCategory} disabled={categorySaving} title="Kategorie speichern" className="active:scale-95">
                <Save size={16} />
              </GlassButton>
              <span className="pr-2 text-body font-medium text-slate-600">{categorySaving ? 'Speichert...' : 'Speichern'}</span>
            </GlassContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[200px]">
          <span className="text-body text-slate-400">Laden...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-panel-soft panel-radius p-6 flex items-center justify-center min-h-[220px]">
          <div className="text-center text-slate-500">
            <p className="text-title font-medium">Noch keine eigene Kategorie</p>
            <p className="text-body mt-2">Lege zuerst eine Unterkategorie an und füge dort Aufgaben per JSON hinzu.</p>
          </div>
        </div>
      ) : (
        categories.map((category) => {
          const categoryTasks = tasksByCategory.get(category.code) ?? [];
          const isTaskFormOpen = openTaskCategoryId === category.id;

          return (
            <div key={category.id} className="space-y-2">
              <div className="w-full flex items-center gap-2 px-1">
                <button
                  onClick={() => onToggleSub(category.code)}
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                >
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${collapsedSubs.has(category.code) ? '-rotate-90' : ''}`}
                  />
                  <div className="min-w-0">
                    <span className="block text-title font-medium text-slate-700 truncate">{category.titel}</span>
                    {category.beschreibung && (
                      <span className="block text-label text-slate-400 truncate">{category.beschreibung}</span>
                    )}
                  </div>
                </button>
                <GlassContainer className="h-10 gap-1.5 px-2.5 shrink-0">
                  <GlassButton onClick={() => handleOpenTaskForm(category.id)} title="Aufgabe hinzufügen" className="active:scale-95">
                    <Plus size={16} />
                  </GlassButton>
                  <span className="pr-2 text-body font-medium text-slate-600">
                    {categoryTasks.length}
                  </span>
                </GlassContainer>
              </div>

              {!collapsedSubs.has(category.code) && (
                <div className="space-y-2">
                  {isTaskFormOpen && (
                    <div className="glass-panel-soft panel-radius border border-white/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-heading font-medium text-slate-800">
                            {editingTaskId !== null ? 'Aufgabe bearbeiten' : category.titel}
                          </h3>
                          {editingTaskId !== null && (
                            <p className="text-label text-slate-400">Entwurf oder Lösung später ergänzen</p>
                          )}
                        </div>
                        <GlassContainer className="h-10 w-10 justify-center shrink-0">
                          <GlassButton onClick={resetTaskForm} title="Schließen" className="active:scale-95">
                            <X size={16} />
                          </GlassButton>
                        </GlassContainer>
                      </div>

                      {taskFormLoading ? (
                        <div className="min-h-[180px] rounded-3xl border border-white/70 bg-white/45 flex items-center justify-center text-body text-slate-400">
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

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <GlassContainer className="h-10 gap-1.5 px-2.5">
                            <GlassButton
                              onClick={() => setTaskJson(CUSTOM_TASK_TEMPLATE)}
                              title="Vorlage einfügen"
                              className="active:scale-95"
                              disabled={taskFormLoading}
                            >
                              <ArrowUpFromLine size={16} />
                            </GlassButton>
                            <span className="pr-2 text-body font-medium text-slate-600">Vorlage</span>
                          </GlassContainer>

                          <GlassContainer className="h-10 gap-1.5 px-2.5">
                            <GlassButton
                              onClick={() => fileInputRef.current?.click()}
                              title="Bild hochladen"
                              className="active:scale-95"
                              disabled={taskFormLoading}
                            >
                              <ImagePlus size={16} />
                            </GlassButton>
                            <span className="pr-2 text-body font-medium text-slate-600">
                              {taskImageName || 'Bild'}
                            </span>
                          </GlassContainer>

                          {taskImageDataUrl && (
                            <GlassContainer className="h-10 w-10 justify-center">
                              <GlassButton
                                onClick={() => {
                                  setTaskImageDataUrl(null);
                                  setTaskImageName('');
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                title="Bild entfernen"
                                className="active:scale-95"
                                disabled={taskFormLoading}
                              >
                                <X size={16} />
                              </GlassButton>
                            </GlassContainer>
                          )}

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>

                        <GlassContainer className="h-10 gap-1.5 px-2.5">
                          <GlassButton
                            onClick={() => handleCreateTask(category.id)}
                            disabled={taskSaving || taskFormLoading}
                            title={editingTaskId !== null ? 'Aufgabe aktualisieren' : 'Aufgabe speichern'}
                            className="active:scale-95"
                          >
                            <Save size={16} />
                          </GlassButton>
                          <span className="pr-2 text-body font-medium text-slate-600">
                            {taskSaving ? 'Speichert...' : editingTaskId !== null ? 'Aktualisieren' : 'Speichern'}
                          </span>
                        </GlassContainer>
                      </div>

                      {taskImageDataUrl && (
                        <div className="rounded-3xl border border-white/70 bg-white/45 p-2">
                          <img src={taskImageDataUrl} alt="Vorschau" className="max-h-48 w-full rounded-2xl object-contain" />
                        </div>
                      )}

                      <div className={`min-h-5 text-label ${taskError ? 'text-rose-500' : 'text-slate-400'}`}>
                        {taskError || 'Auch als Entwurf speicherbar. Leere Lösungen sind okay und können später ergänzt werden.'}
                      </div>
                    </div>
                  )}

                  {categoryTasks.length === 0 ? (
                    <div className="bg-white/35 rounded-xl border border-white/60 px-4 py-3 text-body text-slate-400">
                      Noch keine Aufgaben
                    </div>
                  ) : (
                    categoryTasks.map((task) => {
                      const state = getTaskCheckState(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => onNavigateToTask(task.id, category.code)}
                          className="bg-white/40 rounded-xl border border-white/60 px-3 h-10 cursor-pointer hover:bg-white/60 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
                        >
                          <span className="text-body text-slate-700 truncate flex-1">{task.title}</span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditTask(task.id, category.id);
                            }}
                            title="Aufgabe bearbeiten"
                            className="shrink-0 p-2 -m-2 flex items-center justify-center text-slate-400 hover:text-slate-600"
                          >
                            <Pencil size={14} />
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
                          <ChevronRight size={14} className="text-slate-300 shrink-0" />
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
