<script setup lang="ts">
import { ref, watch } from "vue";
import { ArrowRight as ChevronRightIcon, Check, Delete, Plus } from "@element-plus/icons-vue";
import type { Work, OutlineItem } from "../App.vue";
import { ElMessage } from "element-plus";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const outlineTabs = ref(["catalog", "extract"]);
const activeTab = ref("catalog");
const selectedItemId = ref<string | null>(null);
const outlineTitle = ref("");
const outlineContent = ref("");

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultOutlineItems = (): OutlineItem[] => [
  { id: "root", title: "总纲", content: "", parentId: null, order: 0, expanded: true },
  { id: "book-name", title: "书名", content: props.work?.title || "", parentId: "root", order: 0, expanded: false },
  { id: "book-desc", title: "简介", content: "", parentId: "root", order: 1, expanded: false },
  { id: "book-gold", title: "金手指", content: "", parentId: "root", order: 2, expanded: false },
  { id: "part1", title: "第一卷 统览", content: "", parentId: null, order: 1, expanded: true },
  { id: "chapter1", title: "第1章 章纲", content: "", parentId: "part1", order: 0, expanded: false },
];

const getOutlineItems = () => {
  if (!props.work || !props.work.outline || props.work.outline.length === 0) {
    return defaultOutlineItems();
  }
  return props.work.outline;
};

const getChildren = (parentId: string | null) => {
  return getOutlineItems().filter((item: OutlineItem) => item.parentId === parentId).sort((a: OutlineItem, b: OutlineItem) => a.order - b.order);
};

const toggleExpand = (item: OutlineItem) => {
  if (!props.work?.outline) return;
  const found = props.work.outline.find((i: OutlineItem) => i.id === item.id);
  if (found) {
    found.expanded = !found.expanded;
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
  
  localStorage.setItem("writer-data", JSON.stringify({
    works: props.work ? props.work.outline : [],
    dailyCount: 0,
    dailyTarget: 3000,
  }));
  
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
    const items = getOutlineItems();
    if (items.length > 0) {
      selectItem(items[0]);
    }
  }
});
</script>

<template>
  <el-dialog
    title="大纲"
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    width="900px"
    top="5vh"
  >
    <div class="outline-container">
      <div class="outline-sidebar">
        <div class="outline-tabs">
          <button
            v-for="tab in outlineTabs"
            :key="tab"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab === 'catalog' ? '目录' : '提取' }}
          </button>
        </div>
        <div class="outline-tree">
          <div class="outline-tree-header">
            <span>总纲</span>
            <span>书名 {{ work?.title || '未命名' }}</span>
          </div>
          <template v-for="item in getChildren(null)" :key="item.id">
            <div
              class="outline-tree-item"
              :class="{ active: selectedItemId === item.id }"
              @click="selectItem(item)"
            >
              <div class="tree-item-content">
                <span
                  v-if="getChildren(item.id).length > 0"
                  class="tree-expand"
                  :class="{ expanded: item.expanded }"
                  @click.stop="toggleExpand(item)"
                >
                  <ChevronRightIcon />
                </span>
                <span v-else class="tree-dot"></span>
                <span>{{ item.title }}</span>
              </div>
              <div v-if="item.expanded" class="tree-children">
                <div
                  v-for="child in getChildren(item.id)"
                  :key="child.id"
                  class="outline-tree-item child"
                  :class="{ active: selectedItemId === child.id }"
                  @click="selectItem(child)"
                >
                  <span class="tree-dot"></span>
                  <span>{{ child.title }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="outline-actions">
          <el-button :icon="Plus" size="small" @click="addOutlineItem">
            添加
          </el-button>
        </div>
      </div>
      <div class="outline-detail">
        <div class="detail-header">
          <input
            v-model="outlineTitle"
            class="outline-title-input"
            placeholder="大纲标题"
          />
          <el-button :icon="Check" size="small" @click="saveOutline">
            保存
          </el-button>
          <el-button :icon="Delete" size="small" type="danger" @click="deleteOutline">
            删除
          </el-button>
        </div>
        <textarea
          v-model="outlineContent"
          class="outline-content-input"
          placeholder="大纲内容..."
        ></textarea>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.outline-container {
  display: flex;
  height: 500px;
}

.outline-sidebar {
  width: 280px;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
}

.outline-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid #e8e4dc;
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
}

.outline-tabs button:hover {
  background: #f5f3ef;
}

.outline-tabs button.active {
  background: #c45c3e;
  color: white;
}

.outline-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.outline-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f3ef;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.outline-tree-item {
  padding: 4px 0;
}

.outline-tree-item.child {
  padding-left: 16px;
}

.outline-tree-item .tree-item-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.outline-tree-item:hover .tree-item-content {
  background: #f5f3ef;
}

.outline-tree-item.active .tree-item-content {
  background: rgba(196, 92, 62, 0.1);
}

.tree-expand {
  width: 14px;
  height: 14px;
  color: #999;
  transition: transform 0.2s ease;
}

.tree-expand.expanded {
  transform: rotate(90deg);
}

.tree-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #999;
}

.outline-tree-item span:last-child {
  font-size: 13px;
  color: #333;
}

.outline-actions {
  padding: 8px;
  border-top: 1px solid #e8e4dc;
}

.outline-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.outline-title-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

.outline-title-input:focus {
  border-color: #c45c3e;
}

.outline-content-input {
  flex: 1;
  padding: 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: none;
  line-height: 1.6;
  outline: none;
}

.outline-content-input:focus {
  border-color: #c45c3e;
}
</style>
