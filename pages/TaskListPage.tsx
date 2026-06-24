/**
 * タスク一覧を表示・管理するページコンポーネント
 * タスクの表示、作成、完了状態の切り替え、削除、編集などの機能を提供
 */

import {
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { TASK_ERRORS } from '../constants/errorMessages';
import { PROJECT_CATEGORIES } from '../constants/projectCategories';
import { useSearch } from '../context/SearchContext';
import { taskApi, projectApi, userApi } from '../services/api';

import { ProjectList } from './ProjectList';

import type { Project, Task } from '../types/types';
import './tasklistpage-taskedit.css';

type Category = '学習' | '生活' | '運動' | '仕事' | 'その他';
type Priority = '高' | '中' | '低';

type ExtendedTask = Task & {
  deadLine?: string | null
  startTime?: string | null
  endTime?: string | null
  category?: string | null
  priority?: string | null
  projectId?: number | null
};

type ExtendedProject = Project & {
  completed?: boolean
};

type TaskFormInput = {
  title: string
  description: string
  completed: boolean
  deadLine: string
  startTime: string
  endTime: string
  category: Category | null
  priority: Priority | null
  projectId: number | undefined
};

type ProjectFormInput = {
  name: string
  description: string
  dueDate: string
  category: string
};

const CATEGORY_OPTIONS: Category[] = [
  '学習',
  '生活',
  '運動',
  '仕事',
  'その他',
];

const PRIORITY_OPTIONS: Priority[] = ['高', '中', '低'];

const EMPTY_TASK: TaskFormInput = {
  title: '',
  description: '',
  completed: false,
  deadLine: '',
  startTime: '',
  endTime: '',
  category: null,
  priority: null,
  projectId: undefined,
};

const EMPTY_PROJECT: ProjectFormInput = {
  name: '',
  description: '',
  dueDate: '',
  category: '',
};

const INPUT_LABEL_SLOT_PROPS = {
  inputLabel: {
    shrink: true,
  },
};

const toDateInputValue = (value?: string | null): string => {
  if (!value) return '';

  return String(value).slice(0, 10);
};

const toTimeInputValue = (value?: string | null): string => {
  if (!value) return '';

  const stringValue = String(value);

  if (/^\d{2}:\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 5);
  }

  return '';
};

const formatDeadLine = (
  value?: string | null,
  startTime?: string | null,
  endTime?: string | null,
): string => {
  const dateValue = value ? String(value).slice(0, 10) : '';
  const startText = startTime ? String(startTime).slice(0, 5) : '';
  const endText = endTime ? String(endTime).slice(0, 5) : '';

  let dateText = '';

  if (dateValue) {
    const [year, month, day] = dateValue.split('-');

    if (year && month && day) {
      dateText = `${year}/${month}/${day}`;
    }
  }

  if (dateText && startText && endText) {
    return `${dateText} \n ${startText}〜${endText}`;
  }

  if (dateText && startText) {
    return `${dateText} \n ${startText}`;
  }

  if (dateText && endText) {
    return `${dateText} \n 〜${endText}`;
  }

  if (dateText) {
    return dateText;
  }

  if (startText && endText) {
    return `\n ${startText}〜${endText}`;
  }

  if (startText) {
    return '\n startText';
  }

  if (endText) {
    return `\n 〜${endText}`;
  }

  return 'なし';
};

const isValidDate = (dateStr?: string | null): boolean => {
  if (!dateStr) return true;

  const [year, month, day] = dateStr.split('-').map(Number);

  if (!year || !month || !day) return false;

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
  );
};

const isInvalidTimeRange = (
  start?: string | null,
  end?: string | null,
): boolean => {
  if (!start || !end) return false;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  return startMinutes > endMinutes;
};

const normalizeCategory = (value?: string | null): Category | null => {
  if (
    value === '学習'
    || value === '生活'
    || value === '運動'
    || value === '仕事'
    || value === 'その他'
  ) {
    return value;
  }

  return null;
};

const normalizePriority = (value?: string | null): Priority | null => {
  if (value === '高' || value === '中' || value === '低') {
    return value;
  }

  return null;
};

const getPriorityOrder = (priority?: string | null): number => {
  const order: Record<string, number> = {
    高: 1,
    中: 2,
    低: 3,
  };

  return priority ? order[priority] ?? 4 : 4;
};

const escapeRegExp = (str: string) => (
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

export default function TaskListPage() {
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [allTasks, setAllTasks] = useState<ExtendedTask[]>([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [newTask, setNewTask] = useState<TaskFormInput>(EMPTY_TASK);
  const [createTitleError, setCreateTitleError] = useState('');
  const [createDateError, setCreateDateError] = useState('');
  const [createTimeError, setCreateTimeError] = useState('');
  const [useDetailSetting, setUseDetailSetting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [useTime, setUseTime] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');
  const [isCreating, setIsCreateing] = useState(false);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ExtendedTask | null>(null);
  const [editTitleError, setEditTitleError] = useState('');
  const [editDateError, setEditDateError] = useState('');
  const [editTimeError, setEditTimeError] = useState('');
  const [editUseDetailSetting, setEditUseDetailSetting] = useState(false);

  { /* 詳細画面表示用 */ }
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [detailTask, setDetailTask] = useState<ExtendedTask | null>(null);

  const [projects, setProjects] = useState<ExtendedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ExtendedProject | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormInput>(EMPTY_PROJECT);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<ExtendedProject | null>(null);
  const [projectFilter, setProjectFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [gachaCount, setGachaCount] = useState<number>(0);
  { /* 検索リストの取得 */ }
  const { searchText, setsearchText } = useSearch();
  const [searchTasks, setSearchTasks] = useState<ExtendedTask[]>([]);
  const [input, setInput] = useState('');
  // リストの表示/非表示切り替え
  const [activeTab, setActiveTab] = useState<'search' | 'incomplete' | 'complete'>('search');
  const [openSearchList, setOpenSearchList] = useState(true);
  const [openIncompleteList, setOpenIncompleteList] = useState(true);
  const [openCompletedList, setOpenCompletedList] = useState(true);

  // 肉球ランダムセレクト
  const getRandomStamp = (id: number) => {
    // スタンプ集
    const stampImages = [
      './images/task/nikukyu2.png',
      './images/task/nikukyu3.png',
      './images/task/hidume.png',
      // './images/task/hand.png',
      './images/task/kaityoustamp.png',
    ];

    // 適当ハッシュ（軽い・高速）
    const temp = (id * 9301 + 49297) % 233280;
    const hash = (temp * 9301 + 49297) % 233280;

    const index = hash % stampImages.length;
    return stampImages[index];
  };

  // スタンプのランダム配置
  const stampStyle = (id: number) => {
    const str = id.toString();

    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      hash = hash * 31 + str.charCodeAt(i);
    }

    return {
      rotate: (hash % 30) - 15,
      offsetX: (hash % 6) - 3,
      offsetY: ((hash >> 3) % 6) - 3,
      scale: 0.9 + ((hash % 20) / 100),
    };
  };

  // チェックポイント配置用
  const points = [
    { id: 1, top: '70%', left: '70%', threshold: 2 },
    { id: 2, top: '55%', left: '15%', threshold: 4 },
    { id: 3, top: '40%', left: '60%', threshold: 6 },
    { id: 4, top: '25%', left: '20%', threshold: 8 },
    { id: 5, top: '15%', left: '70%', threshold: 10 },
  ];

  /**
   * Collection一覧モーダルの表示状態
   * テスト用ボタンからCollection画面の表示・非表示を制御する
   */
  const [openCollectionList, setOpenCollectionList] = useState(false);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  /**
   * 最新のタスク一覧を取得.(追記:ユーザーすべてのタスクを取得するよう変更)
   */
  const fetchTasks = async () => {
    try {
      const fetchedTasks = await taskApi.getTasks();
      // setTasks(fetchedTasks as ExtendedTask[]);

      setAllTasks(fetchedTasks as ExtendedTask[]);
    } catch (error) {
      console.error(`${TASK_ERRORS.FETCH_FAILED}:`, error);
    }
  };

  const navigate = useNavigate();

  const handleGoToGacha = () => {
    navigate('/gacha');
  };
  /**
   * 最新のタスク一覧から完了済みのみを取得.
   *
   * @return 完了済みのタスク数
   */
  const completedTasksNum = useMemo(() => {
    const allCompletedTasks = allTasks.filter(task => task.completed).length;
    const temp = allCompletedTasks - 10 * gachaCount;
    if (temp <= 0) {
      return 0;
    }
    return temp;
  }, [allTasks, gachaCount]);

  // 追加機能:熊を歩かせる↓
  const totalTaskCount = 10; // 最大タスク数

  const progress = completedTasksNum === 0 ? 0 : completedTasksNum / totalTaskCount;

  const baseTop = 90;
  const baseleft = 50;

  let width = 100;
  let height = 150;
  let left = baseleft;
  let top = baseTop;
  let imageSrc = '/images/progress/walkingbear.png';

  if (progress <= 0.2) {
    const t = progress / 0.2;
    left = baseleft + t * 10;
    top = baseTop - t * 10;
  } else if (progress <= 0.4) {
    const t = (progress - 0.2) / 0.2;
    left = baseleft + 30 - t * 40;
    top = (baseTop - 10) - t * 20;
    imageSrc = '/images/progress/walkingbear2.png';
  } else if (progress <= 0.6) {
    const t = (progress - 0.4) / 0.2;
    left = baseleft - 20 + t * 30;
    top = baseTop - 38 - t * 7;
    imageSrc = '/images/progress/walkingbear.png';
  } else if (progress <= 0.8) {
    const t = (progress - 0.6) / 0.2;
    left = baseleft + 25 - t * 35;
    top = baseTop - 40 - t * 20;
    imageSrc = '/images/progress/slippingbear.png';
  } else if (progress <= 0.9) {
    const t = (progress - 0.8) / 0.2;
    left = baseleft + t * 2;
    top = (baseTop - 60) - t * 10;
    imageSrc = '/images/progress/walkingbear.png';
  } else if (progress === 1) {
    const t = (progress - 0.8) / 0.2;
    left = baseleft + t * 2;
    top = (baseTop - 60) - t * 10;
    imageSrc = '/images/progress/happybear.png';

    width = 250;
    height = 200;
  }
  const leftPosition = `${left}%`;
  const topPosition = `${top}%`;

  /**
   * 最新の目標一覧を取得.
   */
  const fetchProjects = useCallback(async () => {
    const data = await projectApi.getProjects();

    setProjects(data as ExtendedProject[]);

    setSelectedProjectId((currentId) => {
      if (currentId && data.some(project => project.id === currentId)) {
        return currentId;
      }

      return data[0]?.id ?? null;
    });
  }, []);

  const fetchTasksforProj = useCallback(async (projectId: number | null) => {
    const status = '完成';

    if (!projectId) {
      setTasks([]);
      // setTaskStatus(status);
      return;
    }

    const data = await taskApi.getTasks(projectId);
    setTasks(data);

    const completed = data.filter(t => t.completed);

    // if (data.length > 0 && data.length === completed.length) {
    //  status = '完成';
    // }

    setTaskStatus(status);
  }, []);

  /**
   * ユーザーのタスク一覧を取得
   */
  useEffect(() => {
    fetchTasks();
  }, []);

  /**
   * []内のデータが更新されると実行される
   * 今回は初回のみ実行され、以降は実行されない
   */
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasksforProj(selectedProjectId).catch(() => setErrorMessage('タスクの取得に失敗しました'));
  }, [fetchTasksforProj, selectedProjectId]);

  /*
   * ユーザーのガチャカウントを取得する
   */
  useEffect(() => {
    const fetchData = async () => {
      const result = await userApi.getGachaCount();
      setGachaCount(result);
    };
    fetchData();
  }, []);

  const keyword = (searchText ?? '').trim().toLowerCase();
  useEffect(() => {
    const tempTasks = keyword === ''
      ? []
      : tasks.filter(task =>
        task.title.toLowerCase().includes(keyword)
        || (task.description ?? '').toLowerCase().includes(keyword),
      );
    setSearchTasks(tempTasks);
  }, [keyword, tasks]);

  /**
   * 目標一覧の再取得が行われる
   */
  const refreshSelectedProject = async () => {
    await Promise.all([
      fetchProjects(),
      fetchTasksforProj(selectedProjectId),
    ]);
  };

  const resetProjectDialog = () => {
    setEditingProject(null);
    setProjectForm(EMPTY_PROJECT);
    setOpenProjectDialog(false);
  };

  const openCreateProjectDialog = () => {
    setEditingProject(null);
    setProjectForm(EMPTY_PROJECT);
    setOpenProjectDialog(true);
  };

  const openEditProjectDialog = (project: ExtendedProject) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description ?? '',
      dueDate: project.dueDate ?? '',
      category: project.category ?? '',
    });
    setOpenProjectDialog(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) return;

    const payload = {
      name: projectForm.name.trim(),
      description: projectForm.description,
      dueDate: projectForm.dueDate || undefined,
      category: projectForm.category,
    };

    try {
      if (editingProject) {
        await projectApi.updateProject(editingProject.id, payload);
      } else {
        const createdProject = await projectApi.createProject(payload);
        setSelectedProjectId(createdProject.id);
      }

      resetProjectDialog();
      await fetchProjects();
    } catch (error) {
      setErrorMessage('目標の保存に失敗しました');
      console.error(error);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await projectApi.deleteProject(id);
      await fetchProjects();
    } catch (error) {
      setErrorMessage('目標の削除に失敗しました');
      console.error(error);
    }
  };

  const handleToggleComplete = async (taskId: number) => {
    try {
      const task = tasks.find(targetTask => targetTask.id === taskId);

      if (!task) return;

      const updateTask = {
        title: task.title,
        description: task.description || '',
        completed: !task.completed,
        deadLine: task.deadLine || null,
        startTime: task.startTime || null,
        endTime: task.endTime || null,
        category: task.category || 'その他',
        priority: task.priority || null,
        projectId: task.projectId || null,
      } as unknown as Partial<Task>;

      await taskApi.updateTask(taskId, updateTask);
      await refreshSelectedProject();
      fetchTasks();

      // 多分refreshSelectedProject()で完結してる
    } catch (error) {
      console.error(`${TASK_ERRORS.UPDATE_FAILED}:`, error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await taskApi.deleteTask(taskId);
      fetchTasks();
      fetchTasksforProj(selectedProjectId);
    } catch (error) {
      console.error(`${TASK_ERRORS.DELETE_FAILED}:`, error);
    }
  };

  const handleCloseCreateDialog = () => {
    setOpenDialog(false);
    setNewTask(EMPTY_TASK);
    setUseDetailSetting(false);
    setCreateTitleError('');
    setCreateDateError('');
    setCreateTimeError('');
  };

  const handleOpenEditDialog = (task: ExtendedTask) => {
    const normalizedTask: ExtendedTask = {
      ...task,
      deadLine: toDateInputValue(task.deadLine),
      startTime: toTimeInputValue(task.startTime),
      endTime: toTimeInputValue(task.endTime),
      category: normalizeCategory(task.category),
      priority: normalizePriority(task.priority),
    };

    setEditingTask(normalizedTask);
    setEditUseDetailSetting(true);
    setOpenEditDialog(true);
    setEditTitleError('');
    setEditTimeError('');
    setEditDateError('');
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingTask(null);
    setEditUseDetailSetting(false);
    setEditTitleError('');
    setEditDateError('');
    setEditTimeError('');
  };

  const handleOpenDetailDialog = (task: ExtendedTask) => {
    const normalizedTask: ExtendedTask = {
      ...task,
      deadLine: toDateInputValue(task.deadLine),
      startTime: toTimeInputValue(task.startTime),
      endTime: toTimeInputValue(task.endTime),
      category: normalizeCategory(task.category),
      priority: normalizePriority(task.priority),
    };

    setDetailTask(normalizedTask);
    setEditUseDetailSetting(!!normalizedTask.startTime || !!normalizedTask.endTime);
    setOpenDetailDialog(true);
    setEditTitleError('');
    setEditTimeError('');
    setEditDateError('');
  };

  const handleCloseDetailDialog = () => {
    setOpenDetailDialog(false);
    setDetailTask(null);
    setEditTitleError('');
    setEditDateError('');
    setEditTimeError('');
  };

  const handleCreateTask = async () => {
    if (!newTask.title || newTask.title.trim() === '') {
      setCreateTitleError('タイトルは必須です');
      return;
    }

    if (selectedProjectId === null) {
      setCreateTitleError('まずは目標を作成してください');
      return;
    }

    setCreateTitleError('');

    if (!isValidDate(newTask.deadLine)) {
      setCreateDateError('存在しない日付です');
      return;
    }

    setCreateDateError('');

    if (useDetailSetting && isInvalidTimeRange(newTask.startTime, newTask.endTime)) {
      setCreateTimeError('開始時刻は終了時刻より前に設定してください');
      return;
    }

    setCreateTimeError('');

    setIsCreateing(true);

    try {
      const createTask = {
        title: newTask.title.trim(),
        description: newTask.description || '',
        completed: newTask.completed,
        deadLine: newTask.deadLine || null,
        startTime: useDetailSetting ? newTask.startTime || null : null,
        endTime: useDetailSetting ? newTask.endTime || null : null,
        category: newTask.category || null,
        priority: newTask.priority || null,
        projectId: selectedProjectId || null,
      } as unknown as Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

      await taskApi.createTask(createTask);

      if (selectedProjectId == null) {
        setCreateError('目標を設定してください');
        return;
      }
      handleCloseCreateDialog();
      fetchTasks();
      fetchTasksforProj(selectedProjectId);
    } catch (error) {
      console.error(`${TASK_ERRORS.CREATE_FAILED}:`, error);
      setCreateTitleError(TASK_ERRORS.CREATE_FAILED);
    } finally {
      setIsCreateing(false);
    }
  };

  const handleSaveEditTask = async () => {
    if (!editingTask) return;

    if (!editingTask.title || editingTask.title.trim() === '') {
      setEditTitleError('タイトルは必須です');
      return;
    }

    setEditTitleError('');

    if (!isValidDate(editingTask.deadLine)) {
      setEditDateError('存在しない日付です');
      return;
    }

    setEditDateError('');

    if (editUseDetailSetting && isInvalidTimeRange(editingTask.startTime, editingTask.endTime)) {
      setEditTimeError('開始時刻は終了時刻より前に設定してください');
      return;
    }

    setEditTimeError('');

    try {
      const updateTask = {
        title: editingTask.title.trim(),
        description: editingTask.description || '',
        completed: editingTask.completed,
        deadLine: editingTask.deadLine || null,
        startTime: editUseDetailSetting ? editingTask.startTime || null : null,
        endTime: editUseDetailSetting ? editingTask.endTime || null : null,
        category: editingTask.category || null,
        priority: editingTask.priority || null,
        projectId: selectedProjectId || null,
      } as unknown as Partial<Task>;

      await taskApi.updateTask(editingTask.id, updateTask);
      handleCloseEditDialog();
      fetchTasks();
      fetchTasksforProj(selectedProjectId);
    } catch (error) {
      console.error(`${TASK_ERRORS.UPDATE_FAILED}:`, error);
      setEditTitleError(TASK_ERRORS.UPDATE_FAILED);
    }
  };

  const sortByPriority = (list: ExtendedTask[]) => (
    [...list].sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority))
  );

  const sortedSearchTasks = sortByPriority(searchTasks);
  const incompleteTasks = sortByPriority(tasks.filter(task => !task.completed));
  const completedTasks = sortByPriority(tasks.filter(task => task.completed));

  // 表示するタスクを選択
  const displayedTasks = activeTab === 'search'
    ? sortedSearchTasks
    : activeTab === 'incomplete'
      ? incompleteTasks
      : completedTasks;

  const highlightText = (text?: string, searchKeyword?: string) => {
    if (!text || !searchKeyword) return text || '';

    const escapedKeyword = escapeRegExp(searchKeyword);
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === escapedKeyword.toLowerCase()
        ? <b key={`${part}-${index}`}>{part}</b>
        : part,
    );
  };

  // タスクの表示設定
  const renderTaskItem = (task: ExtendedTask, showEdit: boolean) => (
    <ListItem
      key={task.id}
      onClick={() => handleOpenDetailDialog(task)}
      sx={{
        bgcolor: '#fff',
        borderRadius: 2,
        mb: 2,
        width: '450px',
        px: 2,
        py: 1.5,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
      }}
    >
      <Box
        component="img"
        src="./images/task/Task.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Checkbox
          edge="start"
          checked={Boolean(task.completed)}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleComplete(task.id);
          }}
          sx={{
            ml: -1, // ← 右にずらす
            mr: 1,
            zIndex: 1,
          }}
          checkedIcon={(
            <Box
              component="img"
              src={getRandomStamp(task.id)}
              sx={{
                width: 40,
                height: 40,

                position: 'relative',
                top: `${stampStyle(task.id).offsetY}px`,
                left: `${stampStyle(task.id).offsetX}px`,

                transform: `rotate(${stampStyle(task.id).rotate}deg)
                            scale(${stampStyle(task.id).scale})`,
              }}
            />
          )}
        />

        <ListItemText
          primary={(
            <Box
              sx={{
                maxWidth: '80%',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                minWidth: 0,
                flex: 1,
              }}
            >
              {highlightText(task.title, keyword)}
            </Box>
          )}
          secondary={(
            <>
              <Box
                sx={{
                  maxWidth: '40%',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {task.description
                  ? highlightText(task.description, keyword)
                  : '説明なし'}
              </Box>

              <Box>
                カテゴリ:
                {task.category || 'なし'}
              </Box>

              <Box>
                優先度:
                {task.priority || 'なし'}
              </Box>
            </>
          )}
        />

        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            textAlign: 'left',
            color: 'text.secondary',
            mr: 0,

            position: 'relative',
            top: -25,
          }}
        >
          <Box sx={{ fontWeight: 'bold', whiteSpace: 'pre-line' }}>
            {/* 完了タスクなら完了日を表示 */}
            {showEdit ? '期限:' : '完了日:'}
            {showEdit
              ? formatDeadLine(task.deadLine, task.startTime, task.endTime)
              : formatDeadLine(task.updatedAt)}
          </Box>
        </Box>

        {!task.completed && (
          <ListItemSecondaryAction
            sx={{
              right: 30,
              top: '85%',
              transform: 'translateY(-50%)',
            }}
          >
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                handleOpenEditDialog(task);
              }}
            >
              <Box
                component="img"
                src="./images/task/edit.png"
                alt="編集"
                sx={{
                  width: 35,
                  height: 35,
                  objectFit: 'contain',
                }}
              />
            </IconButton>

            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteTask(task.id);
              }}
            >

              <Box
                component="img"
                src="./images/task/delete.png"
                alt="削除"
                sx={{
                  width: 35,
                  height: 35,
                  objectFit: 'contain',
                }}
              />
            </IconButton>
          </ListItemSecondaryAction>
        )}
      </Box>
    </ListItem>
  );

  const filteredProjects = projects.filter((project) => {
    if (projectFilter === 'complete') return project.completed;
    if (projectFilter === 'incomplete') return !project.completed;
    return true;
  }).filter((project) => {
    if (categoryFilter === 'all') return true;
    const cat = project.category && project.category !== '' ? project.category : 'その他';
    return cat === categoryFilter;
  });

  // タスク一覧ボックスの表示設定
  const renderTaskSection = ({
    title,
    open,
    setOpen,
    tasks,
    showSearch = false,
    showEdit = true,
  }: {
    title: string
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    tasks: ExtendedTask[]
    showSearch?: boolean
    showEdit?: boolean
  }) => (
    <>
      {open && (
        <Box
          sx={{
            position: 'relative',
            mt: '-52%',
            p: 4,
            borderRadius: '46px',
            overflow: 'hidden',

            border: 'none',
            backgroundColor: 'transparent',

            // 高さ固定にすると、タスク数で画像が伸びすぎない
            height: 850,
          }}
        >
          <Box
            component="img"
            src="/images/task/board.png"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
          {/** 検索機能 */}
          {showSearch && (
            <TextField
              variant="outlined"
              size="small"
              placeholder="検索..."
              onChange={(e) => {
                const value = e.target.value;
                console.log('検索:', value);
                setInput(value);
              }}
              /** エンターで検索実行 */
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  console.log('検索:', input);
                  setsearchText(input);
                }
              }}
              sx={{
                position: 'absolute',
                top: '11.5%',
                left: '73%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                borderRadius: 1,
                width: '170px',
                zIndex: 2, // ← Listより上
              }}
            />
          )}

          <Typography
            sx={{
              position: 'absolute',
              top: '16.5%',
              left: '62%',
              zIndex: 2,
              fontWeight: 'bold',
              color: '#5b3b1f',
              fontSize: '18px',
            }}
          >
            {'タスク件数：' + tasks.length + '件'}
          </Typography>

          <List
            sx={{
              'position': 'relative',
              'zIndex': 1,
              'px': 2,
              'mt': '25%',
              'ml': '5.5%',
              // 中だけスクロール
              'height': '80%',
              'width': '91%',
              'overflowX': 'hidden',
              'overflowY': 'auto',
              'pr': 1,

              // スクロール操作は残しつつ、タブレットのようにスクロールバー表示を隠す
              'scrollbarWidth': 'none',
              'msOverflowStyle': 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            }}
          >
            {tasks.map(task => renderTaskItem(task, showEdit))}
          </List>
        </Box>
      )}
    </>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%' }}>

      <ProjectList
        projects={filteredProjects}
        selectedProjectId={selectedProjectId}
        projectFilter={projectFilter}
        categoryFilter={categoryFilter}
        menuAnchor={menuAnchor}
        menuProject={menuProject}
        onCreateProject={openCreateProjectDialog}
        onProjectFilterChange={setProjectFilter}
        onCategoryFilterChange={setCategoryFilter}
        onSelectProject={setSelectedProjectId}
        onMenuAnchorChange={setMenuAnchor}
        onMenuProjectChange={setMenuProject}
        onEditProject={openEditProjectDialog}
        onDeleteProject={handleDeleteProject}
      />

      <Container>

        <Box
          sx={{
            position: 'relative',
            top: '-100px',
            width: '600px', // 好きな幅に調整
            height: '200px', // 画像比率に合わせて調整
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src="/images/task/project.png"
            sx={{
              position: 'absolute',
              inset: 0,
              top: '30px',
              left: 0,
              width: '100%',
              height: '60%',
              objectFit: 'contain',
              zIndex: 4,
              pointerEvents: 'none',
            }}
          />

          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontFamily: 'HGP創英角ﾎﾟｯﾌﾟ体',
              color: '#ffffff',

              mt: 0,
              mb: 2,

              position: 'relative',
              zIndex: 10,
            }}
          >
            {'目標：' + (selectedProject ? selectedProject.name : 'タスク一覧')}
          </Typography>
        </Box>
        {errorMessage && (
          <Typography color="error" sx={{ mb: 1 }}>
            {errorMessage}
          </Typography>
        )}

        {/* タスクリスト表示切替タブ */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 0,
            ml: 5,
            top: '-170px',
            left: '5%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Tab label="検索" sx={{ fontFamily: 'HGP創英角ﾎﾟｯﾌﾟ体', fontSize: '18px' }} value="search" />
          <Tab label="未完了" sx={{ fontFamily: 'HGP創英角ﾎﾟｯﾌﾟ体', fontSize: '18px' }} value="incomplete" />
          <Tab label="完了" sx={{ fontFamily: 'HGP創英角ﾎﾟｯﾌﾟ体', fontSize: '18px' }} value="complete" />

        </Tabs>

        {/* タスクリスト表示 */}
        {activeTab === 'search' && renderTaskSection({
          title: '検索リスト',
          open: openSearchList,
          setOpen: setOpenSearchList,
          tasks: sortedSearchTasks,
          showSearch: true,
        })}

        {activeTab === 'incomplete' && renderTaskSection({
          title: '未完了リスト',
          open: openIncompleteList,
          setOpen: setOpenIncompleteList,
          tasks: incompleteTasks,
          showSearch: false,
        })}

        {activeTab === 'complete' && renderTaskSection({
          title: '完了リスト',
          open: openCompletedList,
          setOpen: setOpenCompletedList,
          tasks: completedTasks,
          showSearch: false,
          showEdit: false,
        })}

        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          onClick={() => setOpenDialog(true)}
        >
          <img
            src="/images/task/createbear.png"
            alt="add"
            style={{ width: 120, height: 120, marginTop: -15 }}
          />
        </Fab>

        <Dialog
          open={openProjectDialog}
          onClose={resetProjectDialog}
          fullWidth
          maxWidth="sm"
          slotProps={{
            paper: {
              sx: {
                'position': 'relative',
                'borderRadius': '14px',
                'border': '4px solid #b86f24',
                'background': 'linear-gradient(180deg, #ffe7ad 0%, #ffe0a0 45%, #ffd790 100%)',
                'boxShadow': '0 12px 28px rgba(77, 40, 9, 0.35), inset 0 0 0 2px rgba(255,255,255,0.48)',
                'overflow': 'visible',
                'color': '#4d2d0d',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 8,
                  borderRadius: '10px',
                  border: '1px solid rgba(169, 98, 29, 0.26)',
                  pointerEvents: 'none',
                },
                '& .MuiInputLabel-root': {
                  color: '#5c3510',
                  fontWeight: 800,
                },
                '& .MuiOutlinedInput-root': {
                  'borderRadius': '9px',
                  'backgroundColor': 'rgba(255, 250, 236, 0.72)',
                  '& fieldset': { borderColor: '#d49a58' },
                  '&:hover fieldset': { borderColor: '#bf7a2e' },
                  '&.Mui-focused fieldset': { borderColor: '#a86422' },
                },
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              position: 'relative',
              mx: 'auto',
              mt: -1.5,
              mb: 1,
              px: 5,
              py: 1.2,
              width: 'fit-content',
              minWidth: 260,
              textAlign: 'center',
              borderRadius: '14px',
              border: '3px solid #bd762a',
              background: 'linear-gradient(180deg, #e5a95b 0%, #cf8737 100%)',
              boxShadow: '0 4px 0 rgba(121, 67, 17, 0.35), inset 0 0 0 1px rgba(255,255,255,0.38)',
              color: '#4a2a0b',
              fontFamily: 'HGP創英角ﾎﾟｯﾌﾟ体',
              fontWeight: 900,
              fontSize: 26,
            }}
          >
            🧸
            {' '}
            {editingProject ? '目標を編集' : '目標を設定'}
            {' '}
            🍯
            <IconButton
              onClick={resetProjectDialog}
              sx={{
                'position': 'absolute',
                'right': -150,
                'top': 4,
                'width': 36,
                'height': 36,
                'border': '2px solid #9f5a1a',
                'bgcolor': '#e39a48',
                'color': '#6b3509',
                'fontWeight': 900,
                '&:hover': { bgcolor: '#f0aa59' },
              }}
            >
              ×
            </IconButton>
          </DialogTitle>

          <DialogContent
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              px: 4,
              pb: 1,
            }}
          >
            <TextField
              fullWidth
              label="タイトル"
              value={projectForm.name}
              onChange={event => setProjectForm({
                ...projectForm,
                name: event.target.value,
              })}
              sx={{ mt: 1 }}
            />
            <TextField
              fullWidth
              label="内容"
              multiline
              minRows={3}
              value={projectForm.description}
              onChange={event => setProjectForm({
                ...projectForm,
                description: event.target.value,
              })}
              sx={{ mt: 0 }}
            />

            <TextField
              fullWidth
              label="締切"
              type="date"
              value={projectForm.dueDate}
              onChange={(event) => {
                setProjectForm({
                  ...projectForm,
                  dueDate: event.target.value,
                });
              }}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              sx={{ mt: 0 }}
            />

            <Box sx={{ mt: 0.5 }}>
              <Typography sx={{ color: '#5c3510', fontWeight: 900, mb: 1 }}>
                カテゴリ
              </Typography>

              <Box sx={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                {PROJECT_CATEGORIES.map(category => (
                  <Box
                    component="label"
                    key={category}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      color: '#4d2d0d',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category}
                      checked={projectForm.category === category}
                      onChange={event =>
                        setProjectForm({
                          ...projectForm,
                          category: event.target.value,
                        })}
                    />
                    {category}
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ position: 'relative', zIndex: 1, px: 4, pb: 3, pt: 2, gap: 1.5 }}>
            <Button
              onClick={resetProjectDialog}
              sx={{
                'minWidth': 110,
                'borderRadius': '10px',
                'bgcolor': 'rgba(255, 245, 218, 0.88)',
                'color': '#6b3b0d',
                'border': '2px solid #d39b59',
                'boxShadow': '0 3px 0 rgba(150, 86, 26, 0.28)',
                'fontWeight': 900,
                '&:hover': { bgcolor: '#fff0c9' },
              }}
            >
              取り消し 🍃
            </Button>

            <Button
              onClick={handleSaveProject}
              sx={{
                'minWidth': 120,
                'borderRadius': '10px',
                'bgcolor': '#b66d1f',
                'color': 'white',
                'border': '2px solid #8f4f13',
                'boxShadow': '0 3px 0 #783f0d, inset 0 0 0 1px rgba(255,255,255,0.25)',
                'fontWeight': 900,
                '&:hover': { bgcolor: '#c77b2b' },
              }}
            >
              保存 🐾
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDialog}
          onClose={handleCloseCreateDialog}
          className="taskedit-dialog"
          slotProps={{
            paper: {
              className: 'taskedit-paper',
            },
          }}
          fullWidth
          maxWidth="sm"

          sx={{
          }}

        >
          <DialogTitle>
            タスク作成
          </DialogTitle>

          <Box component="span" className="taskedit-decoration-cola" aria-hidden="true" />
          <Box component="span" className="taskedit-decoration-branch" aria-hidden="true" />
          <Box component="span" className="taskedit-decoration-grass" aria-hidden="true" />

          <DialogContent className="taskedit-content">
            <TextField
              autoFocus
              margin="dense"
              label="タイトル"
              fullWidth
              value={newTask.title}
              onChange={event =>
                setNewTask({
                  ...newTask,
                  title: event.target.value,
                })}
              error={Boolean(createTitleError)}
              helperText={createTitleError}
              sx={{
              }}
            />

            <TextField
              margin="dense"
              label="説明"
              fullWidth
              multiline
              minRows={3}
              value={newTask.description}
              onChange={event =>
                setNewTask({
                  ...newTask,
                  description: event.target.value,
                })}
              sx={{
              }}
            />

            <TextField
              margin="dense"
              label="期限日"
              type="date"
              fullWidth
              value={newTask.deadLine}
              onChange={(event) => {
                const value = event.target.value;

                setNewTask({
                  ...newTask,
                  deadLine: value,
                });

                if (createDateError) {
                  setCreateDateError('');
                }
              }}
              slotProps={INPUT_LABEL_SLOT_PROPS}
              error={Boolean(createDateError)}
              helperText={createDateError}
              sx={{
                /*
                '& .MuiInputBase-input': {
                  color: '#fcfefff8',
                },
                '& .MuiInputLabel-root': {
                  color: '#fcfefff8',
                },
                */
              }}
            />

            <FormControlLabel
              control={(
                <Checkbox
                  checked={useDetailSetting}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setUseDetailSetting(checked);

                    if (!checked) {
                      setNewTask({
                        ...newTask,
                        startTime: '',
                        endTime: '',
                        category: null,
                        priority: null,
                      });
                    }
                  }}
                />
              )}
              label="詳細設定"
            />

            {useDetailSetting && (
              <Box className="taskedit-detail-area">
                <Box className="taskedit-time-row">
                  <TextField
                    label="開始時間"
                    type="time"
                    fullWidth
                    value={newTask.startTime}
                    onChange={event =>
                      setNewTask({
                        ...newTask,
                        startTime: event.target.value,
                      })}
                    slotProps={INPUT_LABEL_SLOT_PROPS}
                    error={Boolean(createTimeError)}
                  />

                  <TextField
                    label="終了時間"
                    type="time"
                    fullWidth
                    value={newTask.endTime}
                    onChange={event =>
                      setNewTask({
                        ...newTask,
                        endTime: event.target.value,
                      })}
                    slotProps={INPUT_LABEL_SLOT_PROPS}
                    error={Boolean(createTimeError)}
                  />
                </Box>

                {createTimeError && (
                  <Typography color="error" sx={{ mt: 1 }}>
                    {createTimeError}
                  </Typography>
                )}

                <FormControl component="fieldset" margin="normal">
                  <FormLabel>
                    カテゴリ
                  </FormLabel>

                  <RadioGroup
                    row
                    value={newTask.category}
                    onChange={event =>
                      setNewTask({
                        ...newTask,
                        category: event.target.value as Category,
                      })}
                  >
                    {CATEGORY_OPTIONS.map(category => (
                      <FormControlLabel
                        key={category}
                        value={category}
                        control={<Radio />}
                        label={category}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                <FormControl component="fieldset" margin="normal">
                  <FormLabel>
                    優先度
                  </FormLabel>

                  <RadioGroup
                    row
                    value={newTask.priority || null}
                    onChange={event =>
                      setNewTask({
                        ...newTask,
                        priority: event.target.value as Priority,
                      })}
                  >
                    {PRIORITY_OPTIONS.map(priority => (
                      <FormControlLabel
                        key={priority}
                        value={priority}
                        control={<Radio />}
                        label={priority}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>
            )}
          </DialogContent>

          <DialogActions className="taskedit-actions">
            <Button onClick={handleCloseCreateDialog}>
              キャンセル
            </Button>
            <button
              type="button"
              className="taskedit-create-image-button"
              aria-label="作成"
              onClick={handleCreateTask}
              disabled={isCreating} // 連打防止
            />
          </DialogActions>

        </Dialog>

        <Dialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          className="taskedit-dialog"
          slotProps={{
            paper: {
              className: 'taskedit-paper',
            },
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            タスク編集
          </DialogTitle>

          <Box component="span" className="taskedit-decoration-cola" aria-hidden="true" />
          <Box component="span" className="taskedit-decoration-branch" aria-hidden="true" />
          <Box component="span" className="taskedit-decoration-grass" aria-hidden="true" />

          <DialogContent className="taskedit-content">
            {editingTask && (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  label="タイトル"
                  fullWidth
                  value={editingTask.title}
                  onChange={event =>
                    setEditingTask({
                      ...editingTask,
                      title: event.target.value,
                    })}
                  error={Boolean(editTitleError)}
                  helperText={editTitleError}
                />

                <TextField
                  margin="dense"
                  label="説明"
                  fullWidth
                  multiline
                  minRows={3}
                  value={editingTask.description || ''}
                  onChange={event =>
                    setEditingTask({
                      ...editingTask,
                      description: event.target.value,
                    })}
                />

                <TextField
                  margin="dense"
                  label="期限日"
                  type="date"
                  fullWidth
                  value={editingTask.deadLine || ''}
                  onChange={(event) => {
                    const value = event.target.value;

                    setEditingTask({
                      ...editingTask,
                      deadLine: value,
                    });

                    if (editDateError) {
                      setEditDateError('');
                    }
                  }}
                  slotProps={INPUT_LABEL_SLOT_PROPS}
                  error={Boolean(editDateError)}
                  helperText={editDateError}
                />

                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={editUseDetailSetting}
                      onChange={(event) => {
                        const checked = event.target.checked;

                        setEditUseDetailSetting(checked);

                        if (!checked && editingTask) {
                          setEditingTask({
                            ...editingTask,
                            startTime: '',
                            endTime: '',
                          });
                        }
                      }}
                    />
                  )}
                  label="詳細設定"
                  sx={{ mt: 1 }}
                />

                {editUseDetailSetting && (
                  <Box className="taskedit-detail-area">
                    <Box className="taskedit-time-row">
                      <TextField
                        label="開始時間"
                        type="time"
                        fullWidth
                        value={editingTask.startTime || ''}
                        onChange={event =>
                          setEditingTask({
                            ...editingTask,
                            startTime: event.target.value,
                          })}
                        error={Boolean(editTimeError)}
                        slotProps={INPUT_LABEL_SLOT_PROPS}
                      />

                      <TextField
                        label="終了時間"
                        type="time"
                        fullWidth
                        value={editingTask.endTime || ''}
                        onChange={event =>
                          setEditingTask({
                            ...editingTask,
                            endTime: event.target.value,
                          })}
                        error={Boolean(editTimeError)}
                        slotProps={INPUT_LABEL_SLOT_PROPS}
                      />
                    </Box>

                    {editTimeError && (
                      <Typography color="error" sx={{ mt: 1 }}>
                        {editTimeError}
                      </Typography>
                    )}

                    <FormControl component="fieldset" margin="normal">
                      <FormLabel component="legend">
                        カテゴリ
                      </FormLabel>

                      <RadioGroup
                        row
                        value={normalizeCategory(editingTask.category)}
                        onChange={event =>
                          setEditingTask({
                            ...editingTask,
                            category: event.target.value as Category,
                          })}
                      >
                        {CATEGORY_OPTIONS.map(category => (
                          <FormControlLabel
                            key={category}
                            value={category}
                            control={<Radio />}
                            label={category}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>

                    <FormControl component="fieldset" margin="normal">
                      <FormLabel component="legend">
                        優先度
                      </FormLabel>

                      <RadioGroup
                        row
                        value={editingTask.priority || null}
                        onChange={event =>
                          setEditingTask({
                            ...editingTask,
                            priority: event.target.value as Priority,
                          })}
                      >
                        {PRIORITY_OPTIONS.map(priority => (
                          <FormControlLabel
                            key={priority}
                            value={priority}
                            control={<Radio />}
                            label={priority}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </Box>
                )}
              </>
            )}
          </DialogContent>

          <DialogActions className="detail">
            <Button onClick={handleCloseEditDialog}>
              キャンセル
            </Button>
            <button
              type="button"
              className="taskedit-save-image-button"
              aria-label="保存"
              onClick={handleSaveEditTask}
            />
          </DialogActions>
        </Dialog>

        {/* タスク詳細表示用（閲覧のみ可） */}

        <Dialog
          open={openDetailDialog}
          onClose={handleCloseDetailDialog}
          className="taskedit-dialog"
          slotProps={{
            paper: {
              className: 'taskedit-paper',
            },
          }}
          fullWidth
          maxWidth="sm"
        >

          <DialogTitle>
            タスク詳細
          </DialogTitle>
          <Box component="span" className="taskedit-decoration-cola" aria-hidden="true" />
          <Box component="span" className="taskedit-decoration-branch" aria-hidden="true" />
          <Box component="span" className="taskedit-decoration-grass" aria-hidden="true" />

          <DialogContent className="taskedit-content">
            {detailTask && (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  label="タイトル"
                  fullWidth
                  value={detailTask.title}
                  onChange={event =>
                    setEditingTask({
                      ...detailTask,
                      title: event.target.value,
                    })}
                  error={Boolean(editTitleError)}
                  helperText={editTitleError}
                />

                <TextField
                  margin="dense"
                  label="説明"
                  fullWidth
                  multiline
                  minRows={3}
                  value={detailTask.description || ''}
                  onChange={event =>
                    setEditingTask({
                      ...detailTask,
                      description: event.target.value,
                    })}
                />

                <TextField
                  margin="dense"
                  label="期限日"
                  type="date"
                  fullWidth
                  value={detailTask.deadLine || ''}
                  onChange={(event) => {
                    const value = event.target.value;

                    setDetailTask({
                      ...detailTask,
                      deadLine: value,
                    });

                    if (editDateError) {
                      setEditDateError('');
                    }
                  }}
                  slotProps={INPUT_LABEL_SLOT_PROPS}
                  error={Boolean(editDateError)}
                  helperText={editDateError}
                />

                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={editUseDetailSetting}
                      onChange={(event) => {
                        const checked = event.target.checked;

                        setEditUseDetailSetting(checked);

                        if (!checked && editingTask) {
                          setDetailTask({
                            ...detailTask,
                            startTime: '',
                            endTime: '',
                          });
                        }
                      }}
                    />
                  )}
                  label="詳細設定"
                  sx={{ mt: 1 }}
                />

                {editUseDetailSetting && (
                  <Box className="taskedit-detail-area">
                    <Box className="taskedit-time-row">
                      <TextField
                        label="開始時間"
                        type="time"
                        fullWidth
                        value={detailTask.startTime || ''}
                        onChange={event =>
                          setEditingTask({
                            ...detailTask,
                            startTime: event.target.value,
                          })}
                        error={Boolean(editTimeError)}
                        slotProps={INPUT_LABEL_SLOT_PROPS}
                      />

                      <TextField
                        label="終了時間"
                        type="time"
                        fullWidth
                        value={detailTask.endTime || ''}
                        onChange={event =>
                          setEditingTask({
                            ...detailTask,
                            endTime: event.target.value,
                          })}
                        error={Boolean(editTimeError)}
                        slotProps={INPUT_LABEL_SLOT_PROPS}
                      />
                    </Box>

                    {editTimeError && (
                      <Typography color="error" sx={{ mt: 1 }}>
                        {editTimeError}
                      </Typography>
                    )}

                    <FormControl component="fieldset" margin="normal">
                      <FormLabel component="legend">
                        カテゴリ
                      </FormLabel>

                      <RadioGroup
                        row
                        value={normalizeCategory(detailTask.category)}
                        onChange={event =>
                          setDetailTask({
                            ...detailTask,
                            category: event.target.value as Category,
                          })}
                      >
                        {CATEGORY_OPTIONS.map(category => (
                          <FormControlLabel
                            key={category}
                            value={category}
                            control={<Radio disabled />}
                            label={category}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>

                    <FormControl component="fieldset" margin="normal">
                      <FormLabel component="legend">
                        優先度
                      </FormLabel>

                      <RadioGroup
                        row
                        value={detailTask.priority || null}
                        onChange={event =>
                          setDetailTask({
                            ...detailTask,
                            priority: event.target.value as Priority,
                          })}
                      >
                        {PRIORITY_OPTIONS.map(priority => (
                          <FormControlLabel
                            key={priority}
                            value={priority}
                            control={<Radio disabled />}
                            label={priority}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </Box>
                )}
              </>
            )}
          </DialogContent>

          <DialogActions className="taskedit-actions">
            <Button onClick={handleCloseDetailDialog}>
              閉じる
            </Button>
          </DialogActions>
        </Dialog>
        {/**
         * ~~~~~~~~~~~~~~~~~~~~~~
         * タスク用の各種ボタン終了
         * ~~~~~~~~~~~~~~~~~~~~~~
         */}

        {/*
          *********************************************************************************
          各種ボタン設定終了
          *********************************************************************************
        */}

        {/**
         * 実績表示画面
         */}

      </Container>
      <Box
        sx={{
          position: 'relative',
          top: 0,
          right: 0,
          height: '75vh',
          width: 600,
          display: 'inline-block',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 100,
          pr: '10px',

          bgcolor: 'rgba(255, 154, 71, 0.96)',
          backdropFilter: 'blur(6px)',

          border: '3px solid rgba(255,255,255,0.5)',
          borderRadius: 6,
          boxShadow: `0 8px 24px rgba(0,0,0,0.25),
                      0 0 20px rgba(255,255,255,0.2)`,
          p: 1,

        }}
      >
        <Box
          component="img"
          src="/images/progress/progress.png"
          onClick={() => navigate('/collectionpagelist')}
          sx={{
            height: '100%', // 画面いっぱい
            width: 'auto', // 比率維持
            objectFit: 'contain', // ← 全体表示（超重要）
            cursor: 'pointer', // カーソルを指マークに変える
            borderRadius: 4,

          }}
        />
        {/* チェックポイント */}
        {points.map(p => (
          <Box
            key={p.id}
            sx={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: '20%',
              pointerEvents: 'none',
            }}
          >
            {/* 達成数 */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '90%',
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: '#ff6b6b',
                color: 'white',
                px: '0.5em',
                py: '0.2em',
                borderRadius: '999px',
                fontSize: '0.8em',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
                fontFamily: 'HGP創英角ﾎﾟｯﾌﾟ体',
              }}
            >
              {completedTasksNum + ' / ' + p.threshold}
            </Box>

            {/* ✅ ピン */}
            <Box
              component="img"
              src={
                completedTasksNum >= p.threshold
                  ? '/images/progress/completedcheck.png'
                  : '/images/progress/incompletecheck.png'
              }
              sx={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          </Box>
        ))}

        <Box
          component="img"
          src="/images/progress/start.png"
          sx={{
            width: 80, // ← 小さくする
            height: 'auto', // 比率維持
            pointerEvents: 'none',
            position: 'absolute',
            top: '80%',
            left: '30%',
          }}
        />
        <Box
          component="img"
          src={imageSrc}
          sx={{
            width: width, // ← 小さくする
            height: height, // 比率維持
            position: 'absolute',
            top: topPosition,
            left: leftPosition,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
}
