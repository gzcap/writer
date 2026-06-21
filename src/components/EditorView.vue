<script setup lang="ts">import { ref, inject, watch } from "vue";
import { Plus, Search, User, Setting } from "@element-plus/icons-vue";
import { ElMessageBox, ElMessage } from "element-plus";
import type { Work, Chapter, Volume, AppState } from "../App.vue";
const appState = inject<AppState>("appState")!;
const loadChapter = inject<(id: string) => void>("loadChapter")!;
const createNewChapter = inject<() => void>("createNewChapter")!;
const createNewVolume = inject<() => void>("createNewVolume")!;
const deleteVolume = inject<(volumeId: string) => void>("deleteVolume")!;
const deleteChapter = inject<(chapterId: string) => void>("deleteChapter")!;
const updateVolumeTitle = inject<(volumeId: string, title: string) => void>("updateVolumeTitle")!;
const updateVolume = inject<(volumeId: string, title: string, description: string) => void>("updateVolume")!;
const reorderVolumes = inject<(volumeIds: string[]) => void>("reorderVolumes")!;
const reorderChapters = inject<(volumeId: string, chapterIds: string[]) => void>("reorderChapters")!;
const autoSave = inject<() => void>("autoSave")!;
const saveImmediately = inject<() => void>("saveImmediately")!;
const markChapterModified = inject<(chapterId: string) => void>("markChapterModified")!;
const chapterTitle = ref("");
const chapterContent = ref("");
const wordCount = ref(0);
const currentWork = ref<Work | null>(null);
const currentChapter = ref<Chapter | null>(null);
const searchQuery = ref("");
const expandedSections = ref<Set<string>>(new Set());
const activeVolumeMenu = ref<string | null>(null);

// 分卷简介对话框
const showVolumeDescDialog = ref(false);
const editingVolumeId = ref<string | null>(null);
const editingVolumeTitle = ref("");
const editingVolumeDesc = ref("");

// 拖拽状态
const draggedVolumeId = ref<string | null>(null);
const draggedChapterId = ref<string | null>(null);
const dragOverVolumeId = ref<string | null>(null);
const dragOverChapterId = ref<string | null>(null);

const getVolumeChapters = (volume: Volume) => {
  if (!currentWork.value) return [];
  return currentWork.value.chapters.filter((ch) => volume.chapterIds.includes(ch.id));
};

const getVolumeWords = (volume: Volume) => {
  const chapters = getVolumeChapters(volume);
  return chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
};

// 获取排序后的卷列表
const getSortedVolumes = () => {
  if (!currentWork.value) return [];
  return [...currentWork.value.volumes].sort((a, b) => a.order - b.order);
};

const createNewChapterInVolume = (volumeId: string) => {
  createNewChapter();
  const work = getWork();
  if (work) {
    const volume = work.volumes.find((v) => v.id === volumeId);
    if (volume && work.chapters.length > 0) {
      const newChapter = work.chapters[work.chapters.length - 1];
      if (!volume.chapterIds.includes(newChapter.id)) {
        volume.chapterIds.push(newChapter.id);
      }
    }
  }
};

const toggleVolumeMenu = (volumeId: string) => {
  activeVolumeMenu.value = activeVolumeMenu.value === volumeId ? null : volumeId;
};

const startEditVolume = (volume: Volume) => {
  editingVolumeId.value = volume.id;
  editingVolumeTitle.value = volume.title;
  editingVolumeDesc.value = volume.description || '';
  showVolumeDescDialog.value = true;
  activeVolumeMenu.value = null;
};

const saveVolumeDesc = () => {
  if (editingVolumeId.value && editingVolumeTitle.value) {
    updateVolume(editingVolumeId.value, editingVolumeTitle.value, editingVolumeDesc.value);
    showVolumeDescDialog.value = false;
    editingVolumeId.value = null;
    editingVolumeTitle.value = "";
    editingVolumeDesc.value = "";
  }
};

const cancelVolumeDesc = () => {
  showVolumeDescDialog.value = false;
  editingVolumeId.value = null;
  editingVolumeTitle.value = "";
  editingVolumeDesc.value = "";
};

// 卷拖拽处理
const onVolumeDragStart = (e: DragEvent, volumeId: string) => {
  draggedVolumeId.value = volumeId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', volumeId);
  }
};

const onVolumeDragOver = (e: DragEvent, volumeId: string) => {
  e.preventDefault();
  if (draggedVolumeId.value && draggedVolumeId.value !== volumeId) {
    dragOverVolumeId.value = volumeId;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
};

const onVolumeDragLeave = () => {
  dragOverVolumeId.value = null;
};

const onVolumeDrop = (e: DragEvent, targetVolumeId: string) => {
  e.preventDefault();
  if (draggedVolumeId.value && draggedVolumeId.value !== targetVolumeId) {
    const sortedVolumes = getSortedVolumes();
    const draggedIndex = sortedVolumes.findIndex(v => v.id === draggedVolumeId.value);
    const targetIndex = sortedVolumes.findIndex(v => v.id === targetVolumeId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // 重新排序
      const newOrder = [...sortedVolumes.map(v => v.id)];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedVolumeId.value);
      
      reorderVolumes(newOrder);
    }
  }
  draggedVolumeId.value = null;
  dragOverVolumeId.value = null;
};

const onVolumeDragEnd = () => {
  draggedVolumeId.value = null;
  dragOverVolumeId.value = null;
};

// 章节拖拽处理
const onChapterDragStart = (e: DragEvent, chapterId: string, volumeId: string) => {
  draggedChapterId.value = chapterId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chapterId);
    e.dataTransfer.setData('volumeId', volumeId);
  }
};

const onChapterDragOver = (e: DragEvent, chapterId: string) => {
  e.preventDefault();
  if (draggedChapterId.value && draggedChapterId.value !== chapterId) {
    dragOverChapterId.value = chapterId;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
};

const onChapterDragLeave = () => {
  dragOverChapterId.value = null;
};

const onChapterDrop = (e: DragEvent, targetChapterId: string, volumeId: string) => {
  e.preventDefault();
  if (draggedChapterId.value && draggedChapterId.value !== targetChapterId) {
    const volume = currentWork.value?.volumes.find(v => v.id === volumeId);
    if (volume) {
      const chapters = getVolumeChapters(volume);
      const draggedIndex = chapters.findIndex(c => c.id === draggedChapterId.value);
      const targetIndex = chapters.findIndex(c => c.id === targetChapterId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // 重新排序
        const newOrder = [...volume.chapterIds];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedChapterId.value);
        
        reorderChapters(volumeId, newOrder);
      }
    }
  }
  draggedChapterId.value = null;
  dragOverChapterId.value = null;
};

const onChapterDragEnd = () => {
  draggedChapterId.value = null;
  dragOverChapterId.value = null;
};

const openOutlineModal = async () => {
  console.log("Outline button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "outline");
};

const openDescriptionModal = async () => {
  console.log("Description button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "description");
};

const openCharacterModal = async () => {
  console.log("Character button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "character");
};

const openInspirationModal = async () => {
  console.log("Inspiration button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "inspiration");
};

// 删除卷（带二次确认）
const handleDeleteVolume = async (volumeId: string) => {
  const volume = currentWork.value?.volumes.find(v => v.id === volumeId);
  if (!volume) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除卷 "${volume.title || '未命名卷'}" 吗？该卷下的所有章节也将被删除，删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await deleteVolume(volumeId);
    activeVolumeMenu.value = null;
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

// 删除章节（带二次确认）
const handleDeleteChapter = async (chapterId: string) => {
  const chapter = currentWork.value?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除章节 "${chapter.title || '未命名章节'}" 吗？删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await deleteChapter(chapterId);
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

// 打开新窗口显示视图
const openViewWindow = async (workId: string, viewType: string) => {
  console.log("openViewWindow called:", workId, viewType);
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const work = appState.works.find(w => w.id === workId);
    const windowTitle = {
      outline: "大纲",
      character: "角色",
      description: "简介",
      inspiration: "灵感"
    }[viewType] || "视图";
    
    const url = `/#/view?workId=${workId}&viewType=${viewType}&title=${encodeURIComponent(work?.title || '')}`;
    console.log("Creating window with URL:", url);
    
    const label = `view-${viewType}-${Date.now()}`;
    console.log("Window label:", label);
    
    new WebviewWindow(label, {
      width: 900,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      title: windowTitle,
      url: url
    });
    
    console.log("Window created");
  } catch (error) {
    console.error("打开新窗口失败:", error);
    // Fallback: 在当前窗口打开
    window.location.hash = `/view?workId=${workId}&viewType=${viewType}`;
  }
};

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

// 内容变化时更新到 appState 并触发自动保存
watch(chapterContent, (val) => {
  updateWordCount(val);
  // 同步更新到 appState
  const work = getWork();
  const chapter = getChapter();
  if (work && chapter) {
    chapter.content = val;
    chapter.wordCount = val.replace(/\s/g, '').length;
    chapter.updatedAt = Date.now();
    work.updatedAt = Date.now();
    // 标记章节为已修改
    markChapterModified(chapter.id);
  }
  autoSave();
});

// 章节标题变化时更新到 appState 并触发自动保存
watch(chapterTitle, (val) => {
  const work = getWork();
  const chapter = getChapter();
  if (work && chapter) {
    chapter.title = val;
    chapter.updatedAt = Date.now();
    work.updatedAt = Date.now();
    // 标记章节为已修改
    markChapterModified(chapter.id);
  }
  autoSave();
});

// 切换章节前立即保存
watch(() => appState.currentChapterId, () => {
  saveImmediately();
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
          <el-button :icon="Plus" size="small" class="new-volume-btn" @click="createNewVolume">
            新建卷
          </el-button>
          <el-button :icon="Plus" size="small" class="new-chapter-btn-inline" @click="createNewChapter">
            新建章
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
        <div v-if="currentWork?.volumes.length === 0" class="empty-volume">
          <span>暂无卷</span>
        </div>
        <div 
          v-for="volume in getSortedVolumes()" 
          :key="volume.id" 
          class="volume-section"
          :class="{ dragging: draggedVolumeId === volume.id, 'drag-over': dragOverVolumeId === volume.id }"
          draggable="true"
          @dragstart="onVolumeDragStart($event, volume.id)"
          @dragover="onVolumeDragOver($event, volume.id)"
          @dragleave="onVolumeDragLeave"
          @drop="onVolumeDrop($event, volume.id)"
          @dragend="onVolumeDragEnd"
        >
          <div
            class="volume-header"
            @click="toggleSection(volume.id)"
          >
            <span class="expand-icon">{{ expandedSections.has(volume.id) ? '▼' : '▶' }}</span>
            <span class="volume-title">{{ volume.title || "未命名卷" }}</span>
            <span class="volume-count">{{ getVolumeChapters(volume).length }}章 {{ getVolumeWords(volume) }}字</span>
            <button class="volume-add-chapter" @click.stop="createNewChapterInVolume(volume.id)">
              <span class="add-icon">+</span>
            </button>
            <button
              class="volume-more-btn"
              @click.stop="toggleVolumeMenu(volume.id)"
            >
              <span class="more-icon">⋯</span>
            </button>
            <!-- 卷菜单 -->
            <div 
              v-if="activeVolumeMenu === volume.id" 
              class="volume-menu"
              @click.stop
            >
              <div class="menu-header">
                <div class="menu-title">{{ volume.title || "未命名卷" }}</div>
                <div class="menu-info">{{ getVolumeChapters(volume).length }}章 {{ getVolumeWords(volume) }}字</div>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item" @click="startEditVolume(volume)">
                分卷简介
              </div>
              <div class="menu-item" @click="createNewChapterInVolume(volume.id); activeVolumeMenu = null">
                新建章节
              </div>
              <div class="menu-item">
                合并导出章节
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item danger" @click="handleDeleteVolume(volume.id)">
                删除本卷
              </div>
            </div>
          </div>
          <div v-if="expandedSections.has(volume.id)" class="chapter-nested">
            <div
              v-for="chapter in getVolumeChapters(volume)"
              :key="chapter.id"
              class="chapter-item"
              :class="{ active: chapter.id === appState.currentChapterId, dragging: draggedChapterId === chapter.id, 'drag-over': dragOverChapterId === chapter.id }"
              draggable="true"
              @dragstart="onChapterDragStart($event, chapter.id, volume.id)"
              @dragover="onChapterDragOver($event, chapter.id)"
              @dragleave="onChapterDragLeave"
              @drop="onChapterDrop($event, chapter.id, volume.id)"
              @dragend="onChapterDragEnd"
              @click="loadChapter(chapter.id)"
            >
              <span class="chapter-title">{{ chapter.title || "未命名章节" }}</span>
              <span class="chapter-words">{{ chapter.wordCount }}字</span>
              <div class="chapter-actions">
                <button class="chapter-delete-btn" @click.stop="handleDeleteChapter(chapter.id)" title="删除章节">×</button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="currentWork && currentWork.chapters && currentWork.chapters.length > 0 && currentWork.volumes && currentWork.volumes.length === 0" class="chapter-nested">
          <div
            v-for="chapter in currentWork?.chapters"
            :key="chapter.id"
            class="chapter-item"
            :class="{ active: chapter.id === appState.currentChapterId }"
            @click="loadChapter(chapter.id)"
          >
            <span class="chapter-title">{{ chapter.title || "未命名章节" }}</span>
            <span class="chapter-words">{{ chapter.wordCount }}字</span>
            <div class="chapter-actions">
              <button class="chapter-move-btn" @click.stop="moveChapter(chapter.id, 'up')" title="上移" :disabled="currentWork?.chapters.findIndex(c => c.id === chapter.id) === 0">↑</button>
              <button class="chapter-move-btn" @click.stop="moveChapter(chapter.id, 'down')" title="下移" :disabled="currentWork?.chapters.findIndex(c => c.id === chapter.id) === currentWork?.chapters.length - 1">↓</button>
              <button class="chapter-delete-btn" @click.stop="handleDeleteChapter(chapter.id)" title="删除章节">×</button>
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
      <div class="side-tool-item" @click="openDescriptionModal">
        <span class="tool-icon">📝</span>
        <span class="tool-name">简介</span>
      </div>
      <div class="side-tool-item" @click="openOutlineModal">
        <span class="tool-icon">📋</span>
        <span class="tool-name">大纲</span>
      </div>
      <div class="side-tool-item" @click="openCharacterModal">
        <User class="tool-icon el-icon" />
        <span class="tool-name">角色</span>
      </div>
      <div class="side-tool-item" @click="appState.showSettingModal = true">
        <Setting class="tool-icon el-icon" />
        <span class="tool-name">设定</span>
      </div>
      <div class="side-tool-item" @click="openInspirationModal">
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
    
    <!-- 分卷简介对话框 -->
    <el-dialog
      v-model="showVolumeDescDialog"
      title="分卷简介"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="卷名">
          <el-input v-model="editingVolumeTitle" placeholder="请输入卷名" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="editingVolumeDesc"
            type="textarea"
            :rows="6"
            placeholder="请输入分卷简介"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelVolumeDesc">取消</el-button>
          <el-button type="primary" @click="saveVolumeDesc">确定</el-button>
        </span>
      </template>
    </el-dialog>
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

.sidebar-actions {
  display: flex;
  gap: 6px;
}

.new-volume-btn {
  flex: 1;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
}

.new-volume-btn:hover {
  background: #a84a32;
}

.new-chapter-btn-inline {
  flex: 1;
  background: #4facfe;
  color: white;
  border: none;
  border-radius: 4px;
}

.new-chapter-btn-inline:hover {
  background: #3a9ce8;
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
  position: relative;
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
  margin-right: 6px;
}

.edit-icon,
.delete-icon {
  width: 14px;
  height: 14px;
  color: #999;
}

.delete-icon:hover {
  color: #c45c3e;
}

.volume-add-chapter {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
  font-size: 14px;
}

.volume-add-chapter:hover {
  background: #a84a32;
}

.add-icon {
  line-height: 1;
}

.volume-more-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
  font-size: 16px;
  color: #999;
}

.volume-more-btn:hover {
  background: #f0ebe3;
}

.more-icon {
  line-height: 1;
}

.volume-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  width: 180px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.menu-header {
  padding: 10px 12px;
  background: #f8f4eb;
}

.menu-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.menu-info {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.menu-divider {
  height: 1px;
  background: #e8e4dc;
}

.menu-item {
  padding: 8px 12px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.menu-item:hover {
  background: #f5f0e8;
}

.menu-item.danger {
  color: #c45c3e;
}

.menu-item.danger:hover {
  background: #ffe4e4;
}

.chapter-title-input {
  flex: 1;
  border: 1px solid #c45c3e;
  border-radius: 2px;
  padding: 2px 4px;
  font-size: 12px;
  outline: none;
}

.empty-volume {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
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

.chapter-actions {
  display: none;
  margin-left: 8px;
}

.chapter-item:hover .chapter-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chapter-delete-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: #ff4d4d;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-delete-btn:hover {
  background: #ff2222;
}

.menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  pointer-events: none;
}

/* 拖拽样式 */
.volume-section.dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

.volume-section.drag-over {
  border-top: 2px solid #409eff;
}

.chapter-item.dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

.chapter-item.drag-over {
  border-top: 2px solid #409eff;
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
