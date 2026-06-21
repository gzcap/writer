/**
 * 应用状态管理模块
 * 使用 Vue 3 的 reactive 和 provide/inject 实现状态管理
 */

import { reactive, computed } from 'vue';
import type { Work, AppState, Tab } from '../types';
import { generateId } from '../utils/utils';

/**
 * 创建应用状态
 */
export const createAppState = (): AppState => {
  return reactive<AppState>({
    view: 'home',
    works: [],
    tabs: [],
    currentTabId: null,
    currentWorkId: null,
    currentChapterId: null,
    savePath: '',
    isSaving: false,
    saveStatus: 'idle',
    theme: 'light',
    editorMode: 'wysiwyg',
    dailyCount: 0,
    dailyTarget: 3000,
    showOutlineModal: false,
    showCharacterModal: false,
    showInspirationModal: false,
    showSettingModal: false,
    showDescriptionModal: false,
    showLocalSaveModal: false,
  });
};

/**
 * 应用状态管理类
 */
export class AppStore {
  private state: AppState;

  constructor(state: AppState) {
    this.state = state;
  }

  /**
   * 获取当前作品
   */
  get currentWork(): Work | undefined {
    return computed(() => 
      this.state.works.find(w => w.id === this.state.currentWorkId)
    ).value;
  }

  /**
   * 获取当前作品索引
   */
  get currentWorkIndex(): number {
    return computed(() => 
      this.state.works.findIndex(w => w.id === this.state.currentWorkId)
    ).value;
  }

  /**
   * 切换视图
   */
  setView(view: 'home' | 'editor'): void {
    this.state.view = view;
  }

  /**
   * 设置当前作品
   */
  setCurrentWork(workId: string | null): void {
    this.state.currentWorkId = workId;
  }

  /**
   * 设置当前章节
   */
  setCurrentChapter(chapterId: string | null): void {
    this.state.currentChapterId = chapterId;
  }

  /**
   * 设置保存路径
   */
  setSavePath(path: string): void {
    this.state.savePath = path;
    this.saveToLocalStorage();
  }

  /**
   * 设置作品列表
   */
  setWorks(works: Work[]): void {
    this.state.works = works;
  }

  /**
   * 添加作品
   */
  addWork(work: Work): void {
    this.state.works.push(work);
    this.saveToLocalStorage();
  }

  /**
   * 更新作品
   */
  updateWork(workId: string, updates: Partial<Work>): void {
    const index = this.state.works.findIndex(w => w.id === workId);
    if (index !== -1) {
      this.state.works[index] = { ...this.state.works[index], ...updates };
      this.saveToLocalStorage();
    }
  }

  /**
   * 删除作品
   */
  removeWork(workId: string): void {
    const index = this.state.works.findIndex(w => w.id === workId);
    if (index !== -1) {
      this.state.works.splice(index, 1);
      this.saveToLocalStorage();
    }
  }

  /**
   * 添加标签页
   */
  addTab(tab: Tab): void {
    this.state.tabs.push(tab);
  }

  /**
   * 移除标签页
   */
  removeTab(tabId: string): void {
    const index = this.state.tabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      this.state.tabs.splice(index, 1);
    }
  }

  /**
   * 设置当前标签页
   */
  setCurrentTab(tabId: string | null): void {
    this.state.currentTabId = tabId;
  }

  /**
   * 设置保存状态
   */
  setSaveStatus(status: 'idle' | 'saving' | 'saved' | 'error'): void {
    this.state.saveStatus = status;
    this.state.isSaving = status === 'saving';
  }

  /**
   * 保存到 localStorage
   */
  saveToLocalStorage(): void {
    localStorage.setItem('writer-data', JSON.stringify({
      works: this.state.works,
      savePath: this.state.savePath,
    }));
  }

  /**
   * 从 localStorage 加载
   */
  loadFromLocalStorage(): void {
    const saved = localStorage.getItem('writer-data');
    if (saved) {
      const data = JSON.parse(saved);
      this.state.works = data.works || [];
      this.state.savePath = data.savePath || '';
    }
  }

  /**
   * 创建新作品
   */
  createNewWork(title: string): Work {
    const work: Work = {
      id: generateId(),
      title,
      description: '',
      cover: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      volumes: [],
      chapters: [],
      characters: [],
      outline: [],
      inspirations: [],
      totalWordCount: 0,
    };
    this.addWork(work);
    return work;
  }
}

/**
 * 创建应用状态管理实例
 */
export const createAppStore = (state: AppState): AppStore => {
  return new AppStore(state);
};