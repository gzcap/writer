<script setup lang="ts">
import { ref, inject, watch } from "vue";
import { Plus, Search, User, Setting, Delete, Close } from "@element-plus/icons-vue";
import type { Work, Chapter, AppState } from "../App.vue";

const appState = inject<AppState>("appState")!;
const loadChapter = inject<(id: string) => void>("loadChapter")!;
const closeTab = inject<(tabId: string) => void>("closeTab")!;
const switchTab = inject<(tabId: string) => void>("switchTab")!;
const showOutlineModal = inject<{ value: boolean }>("showOutlineModal")!;
const showCharacterModal = inject<{ value: boolean }>("showCharacterModal")!;
const showInspirationModal = inject<{ value: boolean }>("showInspirationModal")!;
const showSettingModal = inject<{ value: boolean }>("showSettingModal")!;

const chapterTitle = ref("");
const chapterContent = ref("");
const wordCount = ref(0);
const currentWork = ref<Work | null>(null);
const currentChapter = ref<Chapter | null>(null);
const searchQuery = ref("");
const expandedSections = ref<Set<string>>(new Set(["volume-1"]));

const getWork = () => {
  return appState.works.find((w: Work) => w.id === appState.currentWorkId);
};

const getChapter = () => {
  const work = getWork();
  return work?.chapters.find((c: Chapter) => c.id === appState.currentChapterId);
};

const updateWordCount = (content: string) => {
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = (content.match(/[a-zA-Z]/g) || []).length;
  wordCount.value = chinese + Math.floor(english / 2);
};

const loadCurrentChapter = () => {
  const work = getWork();
  const chapter = getChapter();
  currentWork.value = work || null;
  currentChapter.value = chapter || null;
  if (chapter) {
    chapterTitle.value = chapter.title;
    chapterContent.value = chapter.content;
    updateWordCount(chapter.content);
  }
};

const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId);
  } else {
    expandedSections.value.add(sectionId);
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

watch(() => [appState.currentWorkId, appState.currentChapterId], () => {
  loadCurrentChapter();
}, { immediate: true });

watch(chapterContent, (val) => {
  updateWordCount(val);
});
</script>

<template>
  <div class="editor-layout">
    <aside class="editor-sidebar-left">
      <div class="sidebar-header">
        <div class="search-box">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="全本"
            class="search-input"
          />
        </div>
        <div class="sidebar-actions">
          <el-button :icon="Plus" size="small" class="new-volume-btn">
            新建卷
          </el-button>
        </div>
      </div>
      
      <div class="sidebar-tabs">
        <button class="tab active">章节</button>
        <button class="tab">筛选</button>
      </div>
      
      <div class="works-related">
        <div class="related-header">
          <span>作品相关</span>
          <span class="related-icon">▼</span>
        </div>
      </div>
      
      <div class="chapter-tree">
        <div class="volume-section">
          <div 
            class="volume-header" 
            @click="toggleSection('volume-1')"
          >
            <span class="expand-icon">{{ expandedSections.has('volume-1') ? '▼' : '▶' }}</span>
            <span class="volume-title">第一卷 武陵篇</span>
            <span class="volume-count">2章</span>
          </div>
          <div v-if="expandedSections.has('volume-1')" class="chapter-nested">
            <div
              v-for="chapter in currentWork?.chapters"
              :key="chapter.id"
              class="chapter-item"
              :class="{ active: chapter.id === appState.currentChapterId }"
              @click.stop="loadChapter(chapter.id)"
            >
              <span class="chapter-title">{{ chapter.title || "未命名章节" }}</span>
              <span class="chapter-words">{{ chapter.wordCount }}字</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <button class="new-chapter-btn">
          <Plus class="btn-icon" />
          <span>新建章节</span>
        </button>
      </div>
    </aside>
    
    <main class="editor-main">
      <div class="tabs-bar" v-if="appState.tabs.length > 0">
        <div
          v-for="tab in appState.tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: appState.currentTabId === tab.id }"
          @click="switchTab(tab.id)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <button class="tab-close" @click.stop="closeTab(tab.id)">
              <Close class="close-icon" />
            </button>
        </div>
      </div>
      
      <header class="editor-toolbar">
        <div class="toolbar-left">
          <button class="tool-btn">
            <span>T</span>
            <span class="tool-label">字体</span>
          </button>
          <button class="tool-btn">
            <span>☰</span>
            <span class="tool-label">背景</span>
          </button>
          <div class="toolbar-divider"></div>
          <button class="tool-btn">
            <span>⊛</span>
            <span class="tool-label">一键排版</span>
          </button>
          <button class="tool-btn">
            <span>＋</span>
            <span class="tool-label">插入</span>
          </button>
          <button class="tool-btn">
            <span>↩</span>
            <span class="tool-label">输入</span>
          </button>
        </div>
        
        <div class="toolbar-center">
          <span class="work-name">{{ currentWork?.title || "未命名作品" }}</span>
          <span class="auto-save">本地实时保存中</span>
        </div>
        
        <div class="toolbar-right">
          <button class="tool-btn">
            <span>⊡</span>
            <span class="tool-label">全屏</span>
          </button>
          <button class="tool-btn">
            <span>ⓧ</span>
            <span class="tool-label">闭关</span>
          </button>
          <button class="tool-btn">
            <span>🔍</span>
            <span class="tool-label">查找替换</span>
          </button>
          <button class="tool-btn">
            <span>ⓝ</span>
            <span class="tool-label">取名</span>
          </button>
          <button class="tool-btn">
            <span>✏️</span>
            <span class="tool-label">画师</span>
          </button>
          <button class="tool-btn">
            <span>↺</span>
            <span class="tool-label">历史</span>
          </button>
          <button class="tool-btn primary">
            <span>发布投稿至阅文</span>
          </button>
          <button class="tool-btn">
            <span>发布至其他平台</span>
          </button>
        </div>
      </header>
      
      <div class="editor-content-area">
        <div class="chapter-title-area">
          <input
            v-model="chapterTitle"
            class="chapter-title-input"
            placeholder="请输入章节标题..."
          />
        </div>
        
        <div class="editor-text-area">
          <textarea
            v-model="chapterContent"
            class="editor-textarea"
            placeholder="开始书写你的故事..."
          ></textarea>
        </div>
      </div>
      
      <footer class="editor-footer">
        <div class="footer-left">
          <span class="plan-info">计划: 到 4,600</span>
        </div>
        <div class="footer-center">
          <span class="chapter-word-count">本章 {{ wordCount }} 字</span>
        </div>
        <div class="footer-right">
          <span class="update-time">更新于 {{ currentChapter ? formatTime(currentChapter.updatedAt) : '--' }}</span>
        </div>
      </footer>
    </main>
    
    <aside class="editor-sidebar-right">
      <div class="side-tool-item" @click="() => {}">
        <span class="tool-icon">✓</span>
        <span class="tool-name">校对</span>
      </div>
      <div class="side-tool-item" @click="() => {}">
        <span class="tool-icon">📝</span>
        <span class="tool-name">拼字</span>
      </div>
      <div class="side-tool-item" @click="showOutlineModal.value = true">
        <span class="tool-icon">📋</span>
        <span class="tool-name">大纲</span>
      </div>
      <div class="side-tool-item" @click="showCharacterModal.value = true">
        <User class="tool-icon el-icon" />
        <span class="tool-name">角色</span>
      </div>
      <div class="side-tool-item" @click="showSettingModal.value = true">
        <Setting class="tool-icon el-icon" />
        <span class="tool-name">设定</span>
      </div>
      <div class="side-tool-item" @click="showInspirationModal.value = true">
        <span class="tool-icon">💡</span>
        <span class="tool-name">灵感</span>
      </div>
      <div class="side-tool-item" @click="() => {}">
        <span class="tool-icon">📚</span>
        <span class="tool-name">属性</span>
      </div>
      <div class="side-tool-item danger" @click="() => {}">
        <Delete class="tool-icon el-icon" />
        <span class="tool-name">回收</span>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  height: 100vh;
  background: #fdf5e6;
}

.editor-sidebar-left {
  width: 220px;
  background: #f8f4eb;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #e8e4dc;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
}

.search-icon {
  width: 14px;
  height: 14px;
  color: #999;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
}

.new-volume-btn {
  width: 100%;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
}

.new-volume-btn:hover {
  background: #a84a32;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e8e4dc;
}

.tab {
  flex: 1;
  padding: 8px;
  text-align: center;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  position: relative;
}

.tab.active {
  color: #c45c3e;
  font-weight: 500;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #c45c3e;
}

.works-related {
  padding: 8px 12px;
  border-bottom: 1px solid #e8e4dc;
}

.related-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.related-icon {
  width: 14px;
  height: 14px;
}

.chapter-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.volume-section {
  margin-bottom: 4px;
}

.volume-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  background: white;
  border-radius: 4px;
  margin-bottom: 2px;
}

.expand-icon {
  width: 14px;
  height: 14px;
  margin-right: 6px;
  color: #999;
}

.volume-title {
  flex: 1;
}

.volume-count {
  font-size: 11px;
  color: #999;
}

.chapter-nested {
  padding-left: 20px;
}

.chapter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin-bottom: 2px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.chapter-item:hover {
  background: #f5f0e8;
}

.chapter-item.active {
  background: #ffe4d4;
  border-left: 3px solid #c45c3e;
}

.chapter-item .chapter-title {
  flex: 1;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-item .chapter-words {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e8e4dc;
}

.new-chapter-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px dashed #c45c3e;
  background: transparent;
  border-radius: 4px;
  color: #c45c3e;
  font-size: 12px;
  cursor: pointer;
}

.new-chapter-btn:hover {
  background: #ffe4d4;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fdf5e6;
  position: relative;
}

.tabs-bar {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background: #f8f4eb;
  border-bottom: 1px solid #e8e4dc;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  border: 1px solid #e8e4dc;
  border-bottom: none;
}

.tab-item:hover {
  background: #f5f0e8;
}

.tab-item.active {
  background: #fdf5e6;
  color: #c45c3e;
  font-weight: 500;
}

.tab-title {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
}

.tab-close:hover {
  background: #ffe4e4;
}

.close-icon {
  width: 12px;
  height: 12px;
  color: #999;
}

.tab-close:hover .close-icon {
  color: #c45c3e;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e8e4dc;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.tool-btn:hover {
  background: #f5f0e8;
}

.tool-btn.primary {
  background: #c45c3e;
  color: white;
}

.tool-btn.primary:hover {
  background: #a84a32;
}

.tool-label {
  font-size: 11px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e8e4dc;
  margin: 0 8px;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.work-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.auto-save {
  font-size: 11px;
  color: #999;
}

.editor-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 48px;
  overflow-y: auto;
}

.chapter-title-area {
  margin-bottom: 20px;
}

.chapter-title-input {
  width: 100%;
  padding: 8px 0;
  font-size: 24px;
  font-weight: 600;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
}

.chapter-title-input:focus {
  border-bottom-color: #c45c3e;
}

.editor-text-area {
  flex: 1;
  position: relative;
}

.editor-textarea {
  width: 100%;
  min-height: 400px;
  height: 100%;
  padding: 16px;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  white-space: pre-wrap;
  word-break: break-word;
}

.editor-textarea::placeholder {
  color: #ccc;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid #e8e4dc;
}

.plan-info, .chapter-word-count, .update-time {
  font-size: 12px;
  color: #666;
}

.editor-sidebar-right {
  width: 48px;
  background: #f8f4eb;
  border-left: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
}

.side-tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.side-tool-item:hover {
  background: #e8e4dc;
}

.side-tool-item.danger {
  margin-top: auto;
}

.side-tool-item.danger:hover {
  background: #ffe4e4;
}

.tool-icon {
  width: 20px;
  height: 20px;
  color: #666;
}

.tool-icon.el-icon {
  font-size: 18px;
}

.tool-name {
  font-size: 10px;
  color: #666;
}
</style>
