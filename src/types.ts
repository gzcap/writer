/**
 * 类型定义文件
 * 定义应用中使用的所有数据结构
 */

/**
 * 作品接口
 */
export interface Work {
  /** 作品ID */
  id: string;
  /** 作品标题 */
  title: string;
  /** 作品简介 */
  description: string;
  /** 作品封面 */
  cover: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 卷列表 */
  volumes: Volume[];
  /** 章节列表 */
  chapters: Chapter[];
  /** 角色列表 */
  characters: Character[];
  /** 大纲列表 */
  outline: OutlineItem[];
  /** 灵感列表 */
  inspirations: Inspiration[];
  /** 总字数 */
  totalWordCount: number;
}

/**
 * 卷接口
 */
export interface Volume {
  /** 卷ID */
  id: string;
  /** 卷标题 */
  title: string;
  /** 卷简介 */
  description: string;
  /** 卷内章节ID列表 */
  chapterIds: string[];
  /** 卷顺序 */
  order: number;
}

/**
 * 章节接口
 */
export interface Chapter {
  /** 章节ID */
  id: string;
  /** 章节标题 */
  title: string;
  /** 章节内容 */
  content: string;
  /** 章节字数 */
  wordCount: number;
  /** 章节大纲 */
  chapterOutline: ChapterOutline[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 章节大纲接口
 */
export interface ChapterOutline {
  /** 大纲ID */
  id: string;
  /** 大纲标题 */
  title: string;
  /** 大纲内容 */
  content: string;
}

/**
 * 角色接口
 */
export interface Character {
  /** 角色ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色类型 */
  role: 'protagonist' | 'supporting' | 'antagonist' | 'other';
  /** 角色头像 */
  avatar: string;
  /** 角色描述 */
  description: string;
  /** 角色性格 */
  personality: string;
  /** 角色背景 */
  background: string;
  /** 其他信息 */
  other: string;
  /** 角色颜色 */
  color: string;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 大纲项接口
 */
export interface OutlineItem {
  /** 大纲ID */
  id: string;
  /** 大纲标题 */
  title: string;
  /** 大纲内容 */
  content: string;
  /** 父节点ID */
  parentId: string | null;
  /** 子节点ID列表 */
  children?: OutlineItem[];
  /** 展开状态 */
  expanded?: boolean;
  /** 顺序 */
  order?: number;
}

/**
 * 灵感接口
 */
export interface Inspiration {
  /** 灵感ID */
  id: string;
  /** 灵感标题 */
  title: string;
  /** 灵感内容 */
  content: string;
  /** 灵感类型 */
  type: string;
  /** 灵感颜色 */
  color: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 标签页接口
 */
export interface Tab {
  /** 标签页ID */
  id: string;
  /** 作品ID */
  workId: string;
  /** 章节ID */
  chapterId: string | null;
  /** 标签页标题 */
  title: string;
  /** 视图类型 */
  viewType?: TabViewType;
}

/**
 * 视图类型
 */
export type TabViewType = 'editor' | 'outline' | 'character' | 'description' | 'inspiration';

/**
 * 应用状态接口
 */
export interface AppState {
  /** 当前视图 */
  view: 'home' | 'editor';
  /** 作品列表 */
  works: Work[];
  /** 标签页列表 */
  tabs: Tab[];
  /** 当前标签页ID */
  currentTabId: string | null;
  /** 当前作品ID */
  currentWorkId: string | null;
  /** 当前章节ID */
  currentChapterId: string | null;
  /** 本地保存路径 */
  savePath: string;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 保存状态 */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  /** 主题 */
  theme: 'light' | 'dark' | 'eye';
  /** 编辑器模式 */
  editorMode: 'wysiwyg' | 'ir' | 'sv';
  /** 今日字数 */
  dailyCount: number;
  /** 今日目标字数 */
  dailyTarget: number;
  /** 是否显示大纲模态框 */
  showOutlineModal: boolean;
  /** 是否显示角色模态框 */
  showCharacterModal: boolean;
  /** 是否显示灵感模态框 */
  showInspirationModal: boolean;
  /** 是否显示设置模态框 */
  showSettingModal: boolean;
  /** 是否显示简介模态框 */
  showDescriptionModal: boolean;
  /** 是否显示本地保存模态框 */
  showLocalSaveModal: boolean;
}

/**
 * 修改追踪接口
 */
export interface ModifiedItems {
  /** 已修改的章节ID集合 */
  chapters: Set<string>;
  /** 已修改的角色ID集合 */
  characters: Set<string>;
  /** 已修改的大纲ID集合 */
  outlines: Set<string>;
  /** 已修改的灵感ID集合 */
  inspirations: Set<string>;
  /** 已修改的简介ID集合 */
  description: Set<string>;
}

/**
 * 保存状态类型
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * 视图类型
 */
export type ViewType = 'outline' | 'character' | 'description' | 'inspiration';