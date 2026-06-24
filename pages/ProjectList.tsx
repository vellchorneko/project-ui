import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  PROJECT_CATEGORIES,
  categoryColorMap,
  categoryIconMap,
} from '../constants/projectCategories';

import type { Project } from '../types/types';

import './tasklistpage-projectlist.css';

type ExtendedProject = Project & {
  completed?: boolean
};

type ProjectFilter = 'all' | 'incomplete' | 'complete';

type ProjectListProps = {
  projects: ExtendedProject[]
  selectedProjectId: number | null
  projectFilter: ProjectFilter
  categoryFilter: string
  menuAnchor: HTMLElement | null
  menuProject: ExtendedProject | null
  onCreateProject: () => void
  onProjectFilterChange: (filter: ProjectFilter) => void
  onCategoryFilterChange: (category: string) => void
  onSelectProject: (projectId: number) => void
  onMenuAnchorChange: (anchor: HTMLElement | null) => void
  onMenuProjectChange: (project: ExtendedProject | null) => void
  onEditProject: (project: ExtendedProject) => void
  onDeleteProject: (projectId: number) => void
};

const projectFilterLabels: Record<ProjectFilter, string> = {
  all: 'すべて',
  incomplete: '未完了',
  complete: '完了',
};

const projectCategoryLabelMap: Record<string, string> = {
  その他: '雑事',
};

const projectCategoryColorOverrides: Record<string, string> = {
  学習: '#c94b3f',
  日常: '#e87d13',
  生活: '#e87d13',
};

const projectCategoryIconOverrides: Record<string, string> = {
  学習: '📖',
  趣味: '🎨',
};

const getProjectCategoryLabel = (category: string) =>
  projectCategoryLabelMap[category] || category;

export function ProjectList({
  projects,
  selectedProjectId,
  projectFilter,
  categoryFilter,
  menuAnchor,
  menuProject,
  onCreateProject,
  onProjectFilterChange,
  onCategoryFilterChange,
  onSelectProject,
  onMenuAnchorChange,
  onMenuProjectChange,
  onEditProject,
  onDeleteProject,
}: ProjectListProps) {
  return (
    <Box className="project-list-sidebar">
      <Box className="project-list-panel">
        <Box
          component="img"
          src="/images/task/board.png"
          className="project-list-board-image"
          aria-hidden="true"
        />

        <Box className="project-list-header">
          <Typography className="project-list-title">🍃 目標一覧 🍃</Typography>

          <Button
            variant="contained"
            onClick={onCreateProject}
            className="project-list-add-button"
          >
            {/*  */}
            <img
              src="/images/task/createbear_p.png"
              alt="add"
              style={{
                width: '320%',
                height: '320%',
                objectFit: 'contain',
              }}
            />
          </Button>
        </Box>

        <Box className="project-list-filter-row">
          {(['all', 'incomplete', 'complete'] as const).map(filter => (
            <Button
              key={filter}
              variant="contained"
              size="small"
              onClick={() => onProjectFilterChange(filter)}
              className={`project-list-filter-button ${projectFilter === filter
                ? 'project-list-filter-button--active'
                : ''
              }`}
            >
              {projectFilterLabels[filter]}
            </Button>
          ))}
        </Box>

        <Box className="project-list-category-select-wrap">
          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
            className="project-list-category-select"
          >
            <option value="all">すべて</option>
            {PROJECT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {getProjectCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </Box>

        <List className="project-list-items">
          {projects.map((project) => {
            const projectCategory = project.category || 'その他';
            const isSelected = project.id === selectedProjectId;
            const categoryColor = projectCategoryColorOverrides[projectCategory]
              || categoryColorMap[projectCategory]
              || categoryColorMap.その他;
            const categoryIcon
              = projectCategoryIconOverrides[projectCategory]
                || categoryIconMap[projectCategory]
                || categoryIconMap.その他;
            const projectCategoryLabel = getProjectCategoryLabel(projectCategory);
            const projectTooltipTitle = (
              <Box className="project-list-tooltip-content">
                <Typography className="project-list-tooltip-line">
                  {project.description || '詳細なし'}
                </Typography>
              </Box>
            );

            return (
              <Tooltip
                key={project.id}
                title={projectTooltipTitle}
                arrow
                placement="right"
                enterDelay={350}
                slotProps={{
                  tooltip: {
                    className: 'project-list-tooltip',
                  },
                  arrow: {
                    className: 'project-list-tooltip-arrow',
                  },
                }}
              >
                <ListItem
                  onClick={() => onSelectProject(project.id)}
                  className={`project-list-card ${isSelected ? 'project-list-card--selected' : ''} ${project.completed ? 'project-list-card--completed' : ''
                  }`}
                >
                  <Box
                    className="project-list-category-icon"
                    sx={{ bgcolor: categoryColor }}
                  >
                    {categoryIcon}
                  </Box>

                  <ListItemText
                    primary={(
                      <Box>
                        <Chip
                          label={projectCategoryLabel}
                          size="small"
                          className="project-list-category-chip"
                          sx={{
                            backgroundColor: categoryColor,
                          }}
                        />

                        <Typography className="project-list-name">
                          {project.name}
                        </Typography>
                      </Box>
                    )}
                    secondary={
                      project.completed
                        ? (
                          <Typography
                            component="span"
                            className="project-list-completed-badge"
                          >
                            🐾 完了
                          </Typography>
                        )
                        : project.dueDate
                          ? (
                            <Typography
                              component="span"
                              className="project-list-date"
                            >
                              {project.dueDate}
                            </Typography>
                          )
                          : null
                    }
                  />

                  <IconButton
                    className="project-list-more-button"
                    onClick={(event) => {
                      event.stopPropagation();

                      onMenuAnchorChange(event.currentTarget);
                      onMenuProjectChange(project);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </ListItem>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          onMenuAnchorChange(null);
          onMenuProjectChange(null);
        }}
        slotProps={{
          paper: {
            className: 'project-list-menu-paper',
          },
          list: {
            className: 'project-list-menu-list',
          },
        }}
      >
        <MenuItem
          className="project-list-menu-item"
          onClick={() => {
            if (menuProject) {
              onEditProject(menuProject);
            }

            onMenuAnchorChange(null);
          }}
        >
          編集
        </MenuItem>

        <MenuItem
          className="project-list-menu-item"
          onClick={() => {
            if (menuProject) {
              onDeleteProject(menuProject.id);
            }

            onMenuAnchorChange(null);
          }}
        >
          削除
        </MenuItem>
      </Menu>
    </Box>
  );
}
