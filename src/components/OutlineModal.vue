<script setup lang="ts">
import { ref, watch, computed, inject } from "vue";
import { Search, Delete, Plus, ArrowDown, ArrowRight } from "@element-plus/icons-vue";
import type { Work, OutlineItem, AppState } from "../types";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const appState = inject<AppState>("appState")!;

const activeTab = ref("catalog");
const selectedItemId = ref<string | null>(null);
const outlineTitle = ref("");
const outlineContent = ref("");
const searchQuery = ref("");
const expandedItems = ref<Set<string>>(new Set(["root"]));
const saveStatus = ref<"saved" | "saving" | "error">("saved");
const saveTimeout = ref<number | null>(null);

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultOutlineItems = (): OutlineItem[] => [
  { id: "root", title: "总纲", content: "", parentId: null, order: 0, expanded: true },
  { id: "book-name", title: "书名", content: props.work?.title || "我有一座桃花源", parentId: "root", order: 0, expanded: false },
  { id: "book-desc", title: "简介", content: `若问道来无余说，天地都在一掌中。\n\n若问道来无余说，天地都在一掌中。\n吾善养吾浩然之气\n\n世之奇伟瑰怪非常之观常在于险远而人之所罕至焉，故非道心坚不能至也`, parentId: "root", order: 1, expanded: false },
  { id: "book-gold", title: "金手指", content: `桃花源\n作用:\n作用:\n1.`, parentId: "root", order: 2, expanded: false },
  { id: "part1", title: "第一卷 统览", content: "", parentId: null, order: 1, expanded: true },
  { id: "chapter1", title: "第1章 章纲", content: "", parentId: "part1", order: 0, expanded: false },
];

const getOutlineItems = computed(() => {
  if (!props.work || !props.work.outline || props.work.outline.length === 0) {
    return defaultOutlineItems();
  }
  return props.work.outline;
});

const getChildren = (parentId: string | null) => {
  return getOutlineItems.value.filter((item: OutlineItem) => item.parentId === parentId).sort((a: OutlineItem, b: OutlineItem) => (a.order || 0) - (b.order || 0));
};

const toggleExpand = (item: OutlineItem) => {
  if (expandedItems.value.has(item.id)) {
    expandedItems.value.delete(item.id);
  } else {
    expandedItems.value.add(item.id);
  }
};

const selectItem = (item: OutlineItem) => {
  selectedItemId.value = item.id;
  outlineTitle.value = item.title;
  outlineContent.value = item.content;
};

// 实时保存到文件系统（独立于整体保存）
const saveOutlineToFile = async () => {
  if (!props.work || !selectedItemId.value || !appState.savePath) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    // 创建书籍文件夹
    const workFolder = await join(appState.savePath, sanitizeFileName(props.work.title || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    // 创建大纲文件夹
    const outlineFolder = await join(workFolder, "大纲");
    await mkdir(outlineFolder, { recursive: true });
    
    // 获取当前选中的大纲项
    const item = getOutlineItems.value.find((i: OutlineItem) => i.id === selectedItemId.value);
    if (item) {
      // 更新内存中的数据
      item.title = outlineTitle.value;
      item.content = outlineContent.value;
      
      // 保存到文件
      const outlinePath = await join(outlineFolder, `${sanitizeFileName(item.title || "未命名")}.md`);
      await writeTextFile(outlinePath, `# ${item.title}\n\n${item.content}`);
    }
    
    saveStatus.value = "saved";
    console.log("大纲已独立保存到文件");
  } catch (error) {
    console.error("保存大纲失败:", error);
    saveStatus.value = "error";
  }
};

// 监听内容变化，独立实时保存
watch([outlineTitle, outlineContent], () => {
  if (!selectedItemId.value || !props.work) return;
  
  // 清除之前的定时器
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }
  
  // 设置新的定时器，2秒后保存
  saveTimeout.value = window.setTimeout(() => {
    saveOutlineToFile();
  }, 2000);
});

const deleteOutline = () => {
  if (!props.work || !selectedItemId.value) return;
  props.work.outline = props.work.outline.filter((i: OutlineItem) => i.id !== selectedItemId.value);
  selectedItemId.value = null;
  outlineTitle.value = "";
  outlineContent.value = "";
};

const addOutlineItem = () => {
  if (!props.work) return;
  const newItem: OutlineItem = {
    id: generateId(),
    title: "新大纲",
    content: "",
    parentId: null,
    order: props.work.outline.length,
    expanded: false,
  };
  props.work.outline.push(newItem);
  selectedItemId.value = newItem.id;
  outlineTitle.value = newItem.title;
};

watch(() => props.visible, (val) => {
  if (val) {
    const items = getOutlineItems.value;
    if (items.length > 0) {
      selectItem(items[0]);
    }
    saveStatus.value = "saved";
  }
});
</script>

<template>
  <el-dialog
    title=""
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    width="900px"
    top="5vh"
    :show-close="false"
    class="outline-modal"
  >
    <div class="outline-header">
      <div class="header-left">
        <span class="header-icon">📋</span>
        <span class="header-title">大纲</span>
        <span class="work-title">{{ work?.title || '未命名作品' }}</span>
      </div>
      <div class="header-right">
        <div class="save-status" :class="saveStatus">
          <span class="status-icon">
            <span v-if="saveStatus === 'saved'">✓</span>
            <span v-else-if="saveStatus === 'saving'" class="spinner">⟳</span>
            <span v-else>✗</span>
          </span>
          <span class="status-text">
            <span v-if="saveStatus === 'saved'">已同步</span>
            <span v-else-if="saveStatus === 'saving'">保存中...</span>
            <span v-else>保存失败</span>
          </span>
        </div>
        <button class="collapse-btn">
          <span>收到侧栏</span>
        </button>
      </div>
    </div>
    
    <div class="outline-toolbar">
      <div class="search-box">
        <Search class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="大纲"
          class="search-input"
        />
      </div>
      <div class="mode-select">
        <ArrowDown class="mode-icon" />
        <span class="mode-text">文本模式</span>
        <ArrowDown class="dropdown-icon" />
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Plus" size="small" class="new-btn" @click="addOutlineItem">
          新建
        </el-button>
        <el-button size="small" class="extract-btn">
          提取
        </el-button>
      </div>
    </div>
    
    <div class="outline-container">
      <div class="outline-sidebar">
        <div class="outline-tabs">
          <button
            :class="{ active: activeTab === 'catalog' }"
            @click="activeTab = 'catalog'"
          >
            目录
          </button>
          <button
            :class="{ active: activeTab === 'extract' }"
            @click="activeTab = 'extract'"
          >
            提取
          </button>
        </div>
        <div class="outline-tree">
          <div class="tree-section">
            <div class="section-header">
              <span class="section-title">总纲</span>
              <ArrowDown class="section-icon" />
            </div>
            <div
              class="tree-item main-item"
              :class="{ active: selectedItemId === 'root' }"
              @click="selectItem({ id: 'root', title: '总纲', content: '', parentId: null, order: 0, expanded: true })"
            >
              <ArrowRight 
                v-if="getChildren('root').length > 0" 
                class="expand-icon"
                :class="{ expanded: expandedItems.has('root') }"
                @click.stop="toggleExpand({ id: 'root', title: '总纲', content: '', parentId: null, order: 0, expanded: true })"
              />
              <span class="item-title">总纲</span>
              <span class="item-subtitle">书名 {{ work?.title || '未命名' }}</span>
            </div>
            <div v-if="expandedItems.has('root')" class="tree-children">
              <div
                v-for="child in getChildren('root')"
                :key="child.id"
                class="tree-item child-item"
                :class="{ active: selectedItemId === child.id }"
                @click="selectItem(child)"
              >
                <span class="child-dot"></span>
                <span class="item-title">{{ child.title }}</span>
              </div>
            </div>
          </div>
          
          <div class="tree-section">
            <div class="section-header">
              <span class="section-title">章纲</span>
              <ArrowDown class="section-icon" />
            </div>
            <template v-for="item in getChildren(null).filter(i => i.id !== 'root')" :key="item.id">
              <div
                class="tree-item main-item"
                :class="{ active: selectedItemId === item.id }"
                @click="selectItem(item)"
              >
                <ArrowRight 
                  v-if="getChildren(item.id).length > 0"
                  class="expand-icon"
                  :class="{ expanded: expandedItems.has(item.id) }"
                  @click.stop="toggleExpand(item)"
                />
                <span class="item-title">{{ item.title }}</span>
              </div>
              <div v-if="expandedItems.has(item.id)" class="tree-children">
                <div
                  v-for="child in getChildren(item.id)"
                  :key="child.id"
                  class="tree-item child-item"
                  :class="{ active: selectedItemId === child.id }"
                  @click="selectItem(child)"
                >
                  <span class="child-dot"></span>
                  <span class="item-title">{{ child.title }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      
      <div class="outline-detail">
        <div class="detail-toolbar">
          <div class="toolbar-left">
            <button class="toolbar-btn">
              <span>↻</span>
            </button>
            <button class="toolbar-btn">
              <span>⊞</span>
            </button>
          </div>
        </div>
        <div class="detail-content">
          <div v-if="selectedItemId === 'root'" class="summary-view">
            <div v-for="child in getChildren('root')" :key="child.id" class="summary-item">
              <h3 class="item-header">{{ child.title }}</h3>
              <div class="item-body">{{ child.content }}</div>
            </div>
          </div>
          <template v-else>
            <input
              v-model="outlineTitle"
              class="outline-title-input"
              placeholder="大纲标题..."
            />
            <textarea
              v-model="outlineContent"
              class="outline-content-input"
              placeholder="大纲内容..."
            ></textarea>
          </template>
        </div>
        <div v-if="selectedItemId !== 'root'" class="detail-footer">
          <div class="footer-left">
            <span class="word-count">{{ outlineContent.length }}/50000</span>
          </div>
          <div class="footer-right">
            <el-button :icon="Delete" size="small" type="danger" @click="deleteOutline">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.outline-modal {
  background: #fdf5e6;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.outline-modal :deep(.el-dialog__body) {
  padding: 0;
}

.outline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #f8f4eb 0%, #f5efe6 100%);
  border-bottom: 1px solid #e8e4dc;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.work-title {
  font-size: 13px;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  
  &.saved {
    background: #e8f5e9;
    color: #2e7d32;
  }
  
  &.saving {
    background: #fff3e0;
    color: #e65100;
  }
  
  &.error {
    background: #ffebee;
    color: #c62828;
  }
}

.status-icon {
  font-size: 12px;
  
  .spinner {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.collapse-btn {
  font-size: 12px;
  color: #666;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.collapse-btn:hover {
  color: #333;
}

.outline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #faf7f0;
  border-bottom: 1px solid #e8e4dc;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 10px;
}

.search-icon {
  font-size: 14px;
  color: #999;
}

.search-input {
  border: none;
  outline: none;
  font-size: 13px;
  width: 120px;
  background: transparent;
}

.mode-select {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.mode-icon {
  font-size: 14px;
}

.mode-text {
  font-size: 13px;
  color: #333;
}

.dropdown-icon {
  font-size: 12px;
  color: #999;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.new-btn {
  background: #4caf50;
  border: none;
  color: white;
}

.extract-btn {
  background: transparent;
  border: 1px solid #ddd;
  color: #666;
}

.outline-container {
  display: flex;
  height: calc(60vh - 80px);
  background: #fdf5e6;
  position: relative;
  overflow: hidden;
}

.outline-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect fill='%23d4c4a8' width='60' height='60' rx='8'/%3E%3Ctext x='30' y='40' font-size='30' text-anchor='middle' fill='%23c4b498' opacity='0.5'%3E%E5%8F%91%3C/text%3E%3C/svg%3E");
  background-size: 120px 120px;
  background-repeat: repeat;
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

.outline-sidebar {
  width: 220px;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.outline-tabs {
  display: flex;
  border-bottom: 1px solid #e8e4dc;
}

.outline-tabs button {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  text-align: left;
  padding-left: 16px;
  
  &.active {
    color: #333;
    font-weight: 500;
    border-bottom: 2px solid #8b7355;
  }
}

.outline-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.tree-section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
}

.section-icon {
  font-size: 10px;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  gap: 8px;
  
  &.main-item {
    font-weight: 500;
    color: #333;
  }
  
  &.child-item {
    padding-left: 32px;
    color: #666;
    font-size: 13px;
  }
  
  &.active {
    background: #f0ebe1;
  }
  
  &:hover:not(.active) {
    background: #f5f1e8;
  }
}

.expand-icon {
  font-size: 12px;
  transition: transform 0.2s;
  
  &.expanded {
    transform: rotate(90deg);
  }
}

.child-dot {
  width: 4px;
  height: 4px;
  background: #bbb;
  border-radius: 50%;
}

.item-title {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-subtitle {
  font-size: 11px;
  color: #999;
}

.tree-children {
  background: #faf7f0;
}

.outline-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.detail-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #e8e4dc;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  
  &:hover {
    background: #f5f5f5;
  }
}

.detail-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.summary-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-item {
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e8e4dc;
}

.item-header {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.item-body {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.outline-title-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  background: transparent;
  outline: none;
  color: #333;
  border-bottom: 2px solid #e8e4dc;
  margin-bottom: 12px;
  
  &:focus {
    border-bottom-color: #8b7355;
  }
}

.outline-content-input {
  width: 100%;
  height: calc(100% - 60px);
  min-height: 200px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.8;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  color: #333;
  font-family: inherit;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #e8e4dc;
  background: #faf7f0;
}

.footer-left {
  font-size: 12px;
  color: #999;
}

.word-count {
  font-family: monospace;
}

.footer-right {
  display: flex;
  gap: 8px;
}
</style>