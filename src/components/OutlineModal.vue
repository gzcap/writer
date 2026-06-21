<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { Search, Check, Delete, Plus, ArrowDown, ArrowRight } from "@element-plus/icons-vue";
import type { Work, OutlineItem } from "../App.vue";
import { ElMessage } from "element-plus";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const activeTab = ref("catalog");
const selectedItemId = ref<string | null>(null);
const outlineTitle = ref("");
const outlineContent = ref("");
const searchQuery = ref("");
const expandedItems = ref<Set<string>>(new Set(["root"]));

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
  return getOutlineItems.value.filter((item: OutlineItem) => item.parentId === parentId).sort((a: OutlineItem, b: OutlineItem) => a.order - b.order);
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

const saveOutline = () => {
  if (!props.work || !selectedItemId.value) return;
  
  let item = props.work.outline.find((i: OutlineItem) => i.id === selectedItemId.value);
  if (!item) {
    item = {
      id: selectedItemId.value,
      title: outlineTitle.value,
      content: outlineContent.value,
      parentId: null,
      order: 0,
      expanded: false,
    };
    props.work.outline.push(item);
  } else {
    item.title = outlineTitle.value;
    item.content = outlineContent.value;
  }
  
  const data = JSON.parse(localStorage.getItem("writer-data") || "{}");
  data.works = props.work ? props.work.outline : [];
  localStorage.setItem("writer-data", JSON.stringify(data));
  
  ElMessage.success("保存成功");
};

const deleteOutline = () => {
  if (!props.work || !selectedItemId.value) return;
  props.work.outline = props.work.outline.filter((i: OutlineItem) => i.id !== selectedItemId.value);
  selectedItemId.value = null;
  outlineTitle.value = "";
  outlineContent.value = "";
  ElMessage.success("删除成功");
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
        <span class="header-title">大纲</span>
        <span class="work-title">{{ work?.title || '未命名作品' }}</span>
      </div>
      <div class="header-right">
        <span class="synced">已同步</span>
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
            <h3 class="outline-title">{{ outlineTitle }}</h3>
            <textarea
              v-model="outlineContent"
              class="outline-content-input"
              placeholder="大纲内容..."
            ></textarea>
          </template>
        </div>
        <div v-if="selectedItemId !== 'root'" class="detail-footer">
          <el-button :icon="Check" size="small" @click="saveOutline">
            保存
          </el-button>
          <el-button :icon="Delete" size="small" type="danger" @click="deleteOutline">
            删除
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.outline-modal {
  background: #fdf5e6;
  border-radius: 8px;
}

.outline-modal :deep(.el-dialog__body) {
  padding: 0;
}

.outline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f4eb;
  border-bottom: 1px solid #e8e4dc;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
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

.synced {
  font-size: 12px;
  color: #999;
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
  background: #eee;
  border-radius: 4px;
}

.outline-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f8f4eb;
  border-bottom: 1px solid #e8e4dc;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 4px;
  padding: 4px 10px;
  border: 1px solid #e8e4dc;
}

.search-icon {
  width: 14px;
  height: 14px;
  color: #999;
  margin-right: 8px;
}

.search-input {
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
  width: 120px;
}

.mode-select {
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid #e8e4dc;
  cursor: pointer;
}

.mode-icon {
  width: 12px;
  height: 12px;
  color: #999;
}

.mode-text {
  font-size: 12px;
  color: #666;
}

.dropdown-icon {
  width: 12px;
  height: 12px;
  color: #999;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.new-btn {
  background: #c45c3e;
  color: white;
  border: none;
}

.new-btn:hover {
  background: #a84a32;
}

.extract-btn {
  background: #f5f3ef;
  color: #666;
  border: 1px solid #e8e4dc;
}

.extract-btn:hover {
  background: #eee;
}

.outline-container {
  display: flex;
  height: 450px;
  background: #fdf5e6;
}

.outline-sidebar {
  width: 280px;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  background: #f8f4eb;
}

.outline-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
}

.outline-tabs button {
  flex: 1;
  padding: 6px 12px;
  font-size: 12px;
  color: #666;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.outline-tabs button:hover {
  background: #f0ebe3;
}

.outline-tabs button.active {
  background: white;
  color: #c45c3e;
  font-weight: 500;
}

.outline-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-section {
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 11px;
  color: #999;
}

.section-icon {
  width: 12px;
  height: 12px;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.tree-item:hover {
  background: #f0ebe3;
}

.tree-item.active {
  background: rgba(196, 92, 62, 0.1);
}

.expand-icon {
  width: 14px;
  height: 14px;
  color: #999;
  margin-right: 6px;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.child-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #999;
  margin-right: 18px;
}

.item-title {
  font-size: 13px;
  color: #333;
}

.item-subtitle {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.child-item {
  padding-left: 22px;
}

.tree-children {
  margin-top: 2px;
}

.outline-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  position: relative;
  overflow: hidden;
}

.detail-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.toolbar-btn:hover {
  background: #f5f3ef;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #e8e4dc;
}

.summary-view {
  line-height: 1.8;
}

.summary-item {
  margin-bottom: 24px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.item-header {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.item-body {
  font-size: 14px;
  color: #444;
  white-space: pre-wrap;
}

.outline-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.outline-content-input {
  width: 100%;
  height: calc(100% - 60px);
  padding: 12px;
  font-size: 14px;
  border: none;
  resize: none;
  outline: none;
  line-height: 1.8;
  white-space: pre-wrap;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
