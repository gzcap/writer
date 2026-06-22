<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import type { Work, OutlineItem } from "../types";
import { Search, Delete, Plus, ArrowDown, ArrowRight, Close } from "@element-plus/icons-vue";
import { ElButton, ElMessageBox, ElMessage } from "element-plus";

const props = defineProps<{
  work: Work | null;
  workTitle: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

// 获取存储路径
const getSavePath = () => {
  return localStorage.getItem("savePath") || "/Users/zmh/Downloads/writer";
};

// 数据状态
const saveStatus = ref<"idle" | "saved" | "saving" | "error">("idle");
const displayStatus = ref<"idle" | "saved" | "saving" | "error">("idle");
const saveTimeout = ref<number | null>(null);
let statusTimeout: number | null = null;

// 延迟显示状态的时间（毫秒）
const statusDelay = 1500;

// 设置显示状态（带延迟）
const setDisplayStatus = (status: "idle" | "saved" | "saving" | "error") => {
  // 清除之前的延迟
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  
  // 如果是正在保存状态，立即显示
  if (status === "saving") {
    displayStatus.value = status;
    return;
  }
  
  // 其他状态延迟显示
  statusTimeout = window.setTimeout(() => {
    displayStatus.value = status;
  }, statusDelay);
};

// 当前活跃的标签：大纲/细纲
const activeTab = ref<"outline" | "detail">("outline");

// 大纲相关
const outlineItems = ref<OutlineItem[]>([]);
const selectedOutlineId = ref<string | null>(null);
const outlineTitle = ref("");
const outlineContent = ref("");
const searchQuery = ref("");
const expandedItems = ref<Set<string>>(new Set(["outline-root"]));

// 细纲相关
const detailItems = ref<OutlineItem[]>([]);
const selectedDetailId = ref<string | null>(null);
const detailTitle = ref("");
const detailContent = ref("");
const detailExpandedItems = ref<Set<string>>(new Set(["detail-root"]));

// 获取大纲子项
const getOutlineChildren = (parentId: string | null) => {
  return outlineItems.value
    .filter((item: OutlineItem) => item.parentId === parentId)
    .sort((a: OutlineItem, b: OutlineItem) => (a.order || 0) - (b.order || 0));
};

// 获取细纲子项
const getDetailChildren = (parentId: string | null) => {
  return detailItems.value
    .filter((item: OutlineItem) => item.parentId === parentId)
    .sort((a: OutlineItem, b: OutlineItem) => (a.order || 0) - (b.order || 0));
};

// 切换大纲展开状态
const toggleOutlineExpand = (item: OutlineItem) => {
  if (expandedItems.value.has(item.id)) {
    expandedItems.value.delete(item.id);
  } else {
    expandedItems.value.add(item.id);
  }
};

// 切换细纲展开状态
const toggleDetailExpand = (item: OutlineItem) => {
  if (detailExpandedItems.value.has(item.id)) {
    detailExpandedItems.value.delete(item.id);
  } else {
    detailExpandedItems.value.add(item.id);
  }
};

// 选择大纲项
const selectOutlineItem = (item: OutlineItem) => {
  selectedOutlineId.value = item.id;
  outlineTitle.value = item.title;
  outlineContent.value = item.content;
};

// 选择细纲项
const selectDetailItem = (item: OutlineItem) => {
  selectedDetailId.value = item.id;
  detailTitle.value = item.title;
  detailContent.value = item.content;
};

// 格式化文本（富文本编辑）
const formatText = (type: string, isOutline: boolean) => {
  const targetContent = isOutline ? outlineContent : detailContent;
  const targetId = isOutline ? selectedOutlineId : selectedDetailId;
  
  if (targetId.value === "outline-root" || targetId.value === "detail-root") return;
  
  const textarea = document.querySelector(isOutline ? '.outline-editor' : '.detail-editor') as HTMLTextAreaElement;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const contentRef = targetContent;
  const selectedText = contentRef.value.substring(start, end);
  
  let formattedText = "";
  let cursorOffset = 0;
  
  switch (type) {
    case 'bold':
      formattedText = `**${selectedText || "粗体文字"}**`;
      cursorOffset = selectedText ? formattedText.length : 2;
      break;
    case 'italic':
      formattedText = `*${selectedText || "斜体文字"}*`;
      cursorOffset = selectedText ? formattedText.length : 1;
      break;
    case 'underline':
      formattedText = `__${selectedText || "下划线文字"}__`;
      cursorOffset = selectedText ? formattedText.length : 2;
      break;
    case 'h1':
      formattedText = `# ${selectedText || "一级标题"}`;
      cursorOffset = formattedText.length;
      break;
    case 'h2':
      formattedText = `## ${selectedText || "二级标题"}`;
      cursorOffset = formattedText.length;
      break;
    case 'h3':
      formattedText = `### ${selectedText || "三级标题"}`;
      cursorOffset = formattedText.length;
      break;
    case 'ul':
      formattedText = `- ${selectedText || "列表项"}`;
      cursorOffset = formattedText.length;
      break;
    case 'ol':
      formattedText = `1. ${selectedText || "列表项"}`;
      cursorOffset = formattedText.length;
      break;
    case 'quote':
      formattedText = `> ${selectedText || "引用文字"}`;
      cursorOffset = formattedText.length;
      break;
    default:
      return;
  }
  
  contentRef.value = contentRef.value.substring(0, start) + formattedText + contentRef.value.substring(end);
  
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
  }, 0);
};

// 新建大纲项
const addOutlineItem = () => {
  const parentId = selectedOutlineId.value || "outline-root";
  // 自动生成大纲名：大纲1、大纲2...
  const existingCount = outlineItems.value.filter((i: OutlineItem) => i.parentId === parentId).length;
  const newItem: OutlineItem = {
    id: Math.random().toString(36).substring(2, 11),
    title: `大纲${existingCount + 1}`,
    content: "",
    parentId: parentId,
    order: outlineItems.value.filter((i: OutlineItem) => i.parentId === parentId).length,
    expanded: false,
  };
  outlineItems.value.push(newItem);
  selectedOutlineId.value = newItem.id;
  outlineTitle.value = newItem.title;
  outlineContent.value = newItem.content;
  
  if (parentId !== "outline-root") {
    expandedItems.value.add(parentId);
  }
  
  saveOutlineToFile();
};

// 新建细纲项
const addDetailItem = () => {
  const parentId = selectedDetailId.value || "detail-root";
  // 自动生成细纲名：第1章、第2章...
  const existingCount = detailItems.value.filter((i: OutlineItem) => i.parentId === parentId).length;
  const newItem: OutlineItem = {
    id: Math.random().toString(36).substring(2, 11),
    title: `第${existingCount + 1}章`,
    content: "",
    parentId: parentId,
    order: detailItems.value.filter((i: OutlineItem) => i.parentId === parentId).length,
    expanded: false,
  };
  detailItems.value.push(newItem);
  selectedDetailId.value = newItem.id;
  detailTitle.value = newItem.title;
  detailContent.value = newItem.content;
  
  if (parentId !== "detail-root") {
    detailExpandedItems.value.add(parentId);
  }
  
  saveDetailToFile();
};

// 删除大纲项（带确认）
const deleteOutlineItem = async (itemId: string) => {
  const item = outlineItems.value.find(i => i.id === itemId);
  if (!item) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${item.title}" 吗？删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 删除对应的文件
    try {
      const { remove, exists } = await import("@tauri-apps/plugin-fs");
      const { join } = await import("@tauri-apps/api/path");
      
      const savePath = getSavePath();
      const sanitizeFileName = (name: string) => {
        return name.replace(/[\\/:*?"<>|]/g, "_").trim();
      };
      
      const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
      const outlineMainFolder = await join(workFolder, "大纲");
      const outlineFolder = await join(outlineMainFolder, "大纲");
      const fileName = sanitizeFileName(item.title);
      const filePath = await join(outlineFolder, `${fileName}.md`);
      
      if (await exists(filePath)) {
        await remove(filePath);
      }
    } catch (fsError) {
      console.error("删除文件失败:", fsError);
    }
    
    const idsToDelete = new Set<string>();
    const collectIds = (id: string) => {
      idsToDelete.add(id);
      outlineItems.value.filter(i => i.parentId === id).forEach(child => collectIds(child.id));
    };
    collectIds(itemId);
    
    outlineItems.value = outlineItems.value.filter(i => !idsToDelete.has(i.id));
    
    if (selectedOutlineId.value && idsToDelete.has(selectedOutlineId.value)) {
      selectedOutlineId.value = null;
      outlineTitle.value = "";
      outlineContent.value = "";
    }
    
    ElMessage.success('删除成功');
  } catch {
    // 用户取消删除
  }
};

// 删除细纲项（带确认）
const deleteDetailItem = async (itemId: string) => {
  const item = detailItems.value.find(i => i.id === itemId);
  if (!item) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${item.title}" 吗？删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 删除对应的文件
    try {
      const { remove, exists } = await import("@tauri-apps/plugin-fs");
      const { join } = await import("@tauri-apps/api/path");
      
      const savePath = getSavePath();
      const sanitizeFileName = (name: string) => {
        return name.replace(/[\\/:*?"<>|]/g, "_").trim();
      };
      
      const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
      const outlineMainFolder = await join(workFolder, "大纲");
      const detailFolder = await join(outlineMainFolder, "细纲");
      const fileName = sanitizeFileName(item.title);
      const filePath = await join(detailFolder, `${fileName}.md`);
      
      if (await exists(filePath)) {
        await remove(filePath);
      }
    } catch (fsError) {
      console.error("删除文件失败:", fsError);
    }
    
    const idsToDelete = new Set<string>();
    const collectIds = (id: string) => {
      idsToDelete.add(id);
      detailItems.value.filter(i => i.parentId === id).forEach(child => collectIds(child.id));
    };
    collectIds(itemId);
    
    detailItems.value = detailItems.value.filter(i => !idsToDelete.has(i.id));
    
    if (selectedDetailId.value && idsToDelete.has(selectedDetailId.value)) {
      selectedDetailId.value = null;
      detailTitle.value = "";
      detailContent.value = "";
    }
    
    ElMessage.success('删除成功');
  } catch {
    // 用户取消删除
  }
};

// 保存大纲到文件
const saveOutlineToFile = async () => {
  if (!props.workTitle) return;
  if (!selectedOutlineId.value || selectedOutlineId.value === "outline-root") return;
  
  saveStatus.value = "saving";
  setDisplayStatus("saving");
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = getSavePath();
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    // 书名文件夹
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    // 大纲文件夹
    const outlineMainFolder = await join(workFolder, "大纲");
    await mkdir(outlineMainFolder, { recursive: true });
    
    // 大纲子文件夹
    const outlineFolder = await join(outlineMainFolder, "大纲");
    await mkdir(outlineFolder, { recursive: true });
    
    // 使用大纲项标题作为文件名
    const fileName = sanitizeFileName(outlineTitle.value || "未命名大纲");
    const outlinePath = await join(outlineFolder, `${fileName}.md`);
    // 文件内容包含标题
    const fileContent = `# ${outlineTitle.value}\n\n${outlineContent.value}`;
    await writeTextFile(outlinePath, fileContent);
    
    saveStatus.value = "saved";
    setDisplayStatus("saved");
  } catch (error) {
    console.error("保存大纲失败:", error);
    saveStatus.value = "error";
    setDisplayStatus("error");
  }
};

// 保存细纲到文件
const saveDetailToFile = async () => {
  if (!props.workTitle) return;
  if (!selectedDetailId.value || selectedDetailId.value === "detail-root") return;
  
  saveStatus.value = "saving";
  setDisplayStatus("saving");
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = getSavePath();
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    // 书名文件夹
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    // 大纲文件夹
    const outlineMainFolder = await join(workFolder, "大纲");
    await mkdir(outlineMainFolder, { recursive: true });
    
    // 细纲子文件夹
    const detailFolder = await join(outlineMainFolder, "细纲");
    await mkdir(detailFolder, { recursive: true });
    
    // 使用细纲项标题作为文件名
    const fileName = sanitizeFileName(detailTitle.value || "未命名细纲");
    const detailPath = await join(detailFolder, `${fileName}.md`);
    // 文件内容包含标题
    const fileContent = `# ${detailTitle.value}\n\n${detailContent.value}`;
    await writeTextFile(detailPath, fileContent);
    
    saveStatus.value = "saved";
    setDisplayStatus("saved");
  } catch (error) {
    console.error("保存细纲失败:", error);
    saveStatus.value = "error";
    setDisplayStatus("error");
  }
};

// 从文件加载大纲
const loadOutlineFromFile = async () => {
  if (!props.workTitle) return;
  
  try {
    const { readTextFile, exists, readDir } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = getSavePath();
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    const outlineMainFolder = await join(workFolder, "大纲");
    const outlineFolder = await join(outlineMainFolder, "大纲");
    
    // 创建默认根节点
    const items: OutlineItem[] = [
      {
        id: "outline-root",
        title: "大纲",
        content: "",
        parentId: null,
        order: 0,
        expanded: true,
      }
    ];
    
    // 检查文件夹是否存在
    if (await exists(outlineFolder)) {
      // 遍历文件夹读取所有.md文件
      const entries = await readDir(outlineFolder);
      let order = 1;
      
      for (const entry of entries) {
        if (entry.isFile && entry.name && entry.name.endsWith('.md')) {
          const filePath = await join(outlineFolder, entry.name);
          const content = await readTextFile(filePath);
          // 文件名去掉.md后缀作为标题
          const title = entry.name.replace('.md', '');
          // 去掉文件内容中的标题行（第一行的 # 标题）
          let actualContent = content;
          const lines = content.split('\n');
          if (lines.length > 0 && lines[0].match(/^#\s+/)) {
            actualContent = lines.slice(1).join('\n').trim();
          }
          
          items.push({
            id: Math.random().toString(36).substring(2, 11),
            title: title,
            content: actualContent,
            parentId: "outline-root",
            order: order++,
            expanded: false,
          });
        }
      }
    }
    
    outlineItems.value = items;
    
    // 选择第一个大纲项
    if (items.length > 1) {
      const firstItem = items.find(i => i.parentId === "outline-root");
      if (firstItem) {
        selectOutlineItem(firstItem);
      }
    }
  } catch (error) {
    console.error("加载大纲失败:", error);
    outlineItems.value = createDefaultOutline();
  }
};

// 从文件加载细纲
const loadDetailFromFile = async () => {
  if (!props.workTitle) return;
  
  try {
    const { readTextFile, exists, readDir } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = getSavePath();
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    const outlineMainFolder = await join(workFolder, "大纲");
    const detailFolder = await join(outlineMainFolder, "细纲");
    
    // 创建默认根节点
    const items: OutlineItem[] = [
      {
        id: "detail-root",
        title: "细纲",
        content: "",
        parentId: null,
        order: 0,
        expanded: true,
      }
    ];
    
    // 检查文件夹是否存在
    if (await exists(detailFolder)) {
      // 遍历文件夹读取所有.md文件
      const entries = await readDir(detailFolder);
      let order = 1;
      
      for (const entry of entries) {
        if (entry.isFile && entry.name && entry.name.endsWith('.md')) {
          const filePath = await join(detailFolder, entry.name);
          const content = await readTextFile(filePath);
          // 文件名去掉.md后缀作为标题
          const title = entry.name.replace('.md', '');
          // 去掉文件内容中的标题行（第一行的 # 标题）
          let actualContent = content;
          const lines = content.split('\n');
          if (lines.length > 0 && lines[0].match(/^#\s+/)) {
            actualContent = lines.slice(1).join('\n').trim();
          }
          
          items.push({
            id: Math.random().toString(36).substring(2, 11),
            title: title,
            content: actualContent,
            parentId: "detail-root",
            order: order++,
            expanded: false,
          });
        }
      }
    }
    
    detailItems.value = items;
    
    // 选择第一个细纲项
    if (items.length > 1) {
      const firstItem = items.find(i => i.parentId === "detail-root");
      if (firstItem) {
        selectDetailItem(firstItem);
      }
    }
  } catch (error) {
    console.error("加载细纲失败:", error);
    detailItems.value = createDefaultDetail();
  }
};

// 创建默认大纲
const createDefaultOutline = (): OutlineItem[] => {
  return [
    {
      id: "outline-root",
      title: "大纲",
      content: "",
      parentId: null,
      order: 0,
      expanded: true,
    }
  ];
};

// 创建默认细纲
const createDefaultDetail = (): OutlineItem[] => {
  return [
    {
      id: "detail-root",
      title: "细纲",
      content: "",
      parentId: null,
      order: 0,
      expanded: true,
    }
  ];
};

// 重新保存
const retrySave = () => {
  if (activeTab.value === "outline") {
    saveOutlineToFile();
  } else {
    saveDetailToFile();
  }
};

// 监听大纲内容变化
watch([outlineItems, outlineTitle, outlineContent], () => {
  if (selectedOutlineId.value && selectedOutlineId.value !== "outline-root") {
    const item = outlineItems.value.find(i => i.id === selectedOutlineId.value);
    if (item) {
      item.title = outlineTitle.value;
      item.content = outlineContent.value;
    }
    
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
    saveTimeout.value = window.setTimeout(() => {
      saveOutlineToFile();
    }, 2000);
  }
}, { deep: true });

// 监听细纲内容变化
watch([detailItems, detailTitle, detailContent], () => {
  if (selectedDetailId.value && selectedDetailId.value !== "detail-root") {
    const item = detailItems.value.find(i => i.id === selectedDetailId.value);
    if (item) {
      item.title = detailTitle.value;
      item.content = detailContent.value;
    }
    
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
    saveTimeout.value = window.setTimeout(() => {
      saveDetailToFile();
    }, 2000);
  }
}, { deep: true });

// 关闭窗口
const closeWindow = () => {
  emit("close");
};

// 初始化
onMounted(async () => {
  await loadOutlineFromFile();
  await loadDetailFromFile();
});
</script>

<template>
  <div class="outline-page">
    <!-- 标题栏 -->
    <div class="page-header" data-tauri-drag-region>
      <!-- macOS红绿灯按钮预留区域 -->
      <div class="traffic-lights-area"></div>
      <div class="header-center">
        <span class="header-icon">📋</span>
        <span class="header-title">大纲</span>
      </div>
      <div class="header-right">
        <div v-if="displayStatus !== 'idle'" class="save-status" :class="displayStatus">
          <span class="status-icon">
            <span v-if="displayStatus === 'saved'">✓</span>
            <span v-else-if="displayStatus === 'saving'" class="spinner">⟳</span>
            <span v-else>✗</span>
          </span>
          <span class="status-text">
            <span v-if="displayStatus === 'saved'">已保存</span>
            <span v-else-if="displayStatus === 'saving'">正在保存...</span>
            <span v-else>保存失败</span>
          </span>
          <button v-if="displayStatus === 'error'" class="retry-btn" @click="retrySave" title="重新保存">
            <span class="retry-icon">⟳</span>
          </button>
        </div>
        <button class="close-btn" @click="closeWindow">
          <Close class="close-icon" />
        </button>
      </div>
    </div>
    
    <!-- 标签栏 -->
    <div class="page-tabs">
      <button 
        class="page-tab" 
        :class="{ active: activeTab === 'outline' }"
        @click="activeTab = 'outline'"
      >
        大纲
      </button>
      <button 
        class="page-tab" 
        :class="{ active: activeTab === 'detail' }"
        @click="activeTab = 'detail'"
      >
        细纲
      </button>
    </div>
    
    <!-- 大纲视图 -->
    <div v-if="activeTab === 'outline'" class="outline-container">
      <div class="outline-sidebar">
        <div class="search-box">
          <Search class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="搜索大纲" class="search-input" />
        </div>
        <div class="outline-tree">
          <div class="tree-item root-item" :class="{ active: selectedOutlineId === 'outline-root' }" @click="selectOutlineItem({ id: 'outline-root', title: '大纲', content: '', parentId: null, order: 0, expanded: true })">
            <span class="folder-icon">📁</span>
            <span class="item-title">大纲</span>
          </div>
          <div class="chapter-list">
            <template v-for="item in getOutlineChildren('outline-root')" :key="item.id">
              <div class="tree-item chapter-item" :class="{ active: selectedOutlineId === item.id }" @click="selectOutlineItem(item)">
                <span class="expand-icon" @click.stop="toggleOutlineExpand(item)">
                  <ArrowDown v-if="expandedItems.has(item.id)" />
                  <ArrowRight v-else />
                </span>
                <span class="item-title">{{ item.title }}</span>
                <button class="delete-btn" @click.stop="deleteOutlineItem(item.id)" title="删除">×</button>
              </div>
            </template>
          </div>
        </div>
        <div class="sidebar-footer">
          <ElButton :icon="Plus" size="small" class="new-btn" @click="addOutlineItem">新增大纲</ElButton>
        </div>
      </div>
      
      <div class="outline-detail">
        <input v-model="outlineTitle" class="detail-title" disabled />
        <div class="rich-editor-container">
          <div class="editor-toolbar">
            <button class="toolbar-btn" @click="formatText('bold', true)" title="粗体"><b>B</b></button>
            <button class="toolbar-btn" @click="formatText('italic', true)" title="斜体"><i>I</i></button>
            <button class="toolbar-btn" @click="formatText('underline', true)" title="下划线"><u>U</u></button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('h1', true)" title="标题1">H1</button>
            <button class="toolbar-btn" @click="formatText('h2', true)" title="标题2">H2</button>
            <button class="toolbar-btn" @click="formatText('h3', true)" title="标题3">H3</button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('ul', true)" title="无序列表">•</button>
            <button class="toolbar-btn" @click="formatText('ol', true)" title="有序列表">1.</button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('quote', true)" title="引用">"</button>
          </div>
          <textarea 
            v-model="outlineContent" 
            class="rich-editor outline-editor" 
            :placeholder="selectedOutlineId === 'outline-root' ? '点击左侧【大纲】选择一个大纲进行编辑，或点击【新增大纲】创建新的大纲...' : '在这里输入大纲内容...'"
            :disabled="selectedOutlineId === 'outline-root'"
          ></textarea>
        </div>
        <div class="detail-footer">
          <span class="word-count">{{ outlineContent.length }} 字符</span>
          <ElButton 
            :icon="Delete" 
            size="small" 
            type="danger" 
            v-if="selectedOutlineId && selectedOutlineId !== 'outline-root'" 
            @click="deleteOutlineItem(selectedOutlineId)"
          >删除</ElButton>
        </div>
      </div>
    </div>
    
    <!-- 细纲视图 -->
    <div v-else-if="activeTab === 'detail'" class="outline-container">
      <div class="outline-sidebar">
        <div class="search-box">
          <Search class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="搜索细纲" class="search-input" />
        </div>
        <div class="outline-tree">
          <div class="tree-item root-item" :class="{ active: selectedDetailId === 'detail-root' }" @click="selectDetailItem({ id: 'detail-root', title: '细纲', content: '', parentId: null, order: 0, expanded: true })">
            <span class="folder-icon">📋</span>
            <span class="item-title">细纲</span>
          </div>
          <div class="chapter-list">
            <template v-for="item in getDetailChildren('detail-root')" :key="item.id">
              <div class="tree-item chapter-item" :class="{ active: selectedDetailId === item.id }" @click="selectDetailItem(item)">
                <span class="expand-icon" @click.stop="toggleDetailExpand(item)">
                  <ArrowDown v-if="detailExpandedItems.has(item.id)" />
                  <ArrowRight v-else />
                </span>
                <span class="item-title">{{ item.title }}</span>
                <button class="delete-btn" @click.stop="deleteDetailItem(item.id)" title="删除">×</button>
              </div>
            </template>
          </div>
        </div>
        <div class="sidebar-footer">
          <ElButton :icon="Plus" size="small" class="new-btn" @click="addDetailItem">新增细纲</ElButton>
        </div>
      </div>
      
      <div class="outline-detail">
        <input v-model="detailTitle" class="detail-title" disabled />
        <div class="rich-editor-container">
          <div class="editor-toolbar">
            <button class="toolbar-btn" @click="formatText('bold', false)" title="粗体"><b>B</b></button>
            <button class="toolbar-btn" @click="formatText('italic', false)" title="斜体"><i>I</i></button>
            <button class="toolbar-btn" @click="formatText('underline', false)" title="下划线"><u>U</u></button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('h1', false)" title="标题1">H1</button>
            <button class="toolbar-btn" @click="formatText('h2', false)" title="标题2">H2</button>
            <button class="toolbar-btn" @click="formatText('h3', false)" title="标题3">H3</button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('ul', false)" title="无序列表">•</button>
            <button class="toolbar-btn" @click="formatText('ol', false)" title="有序列表">1.</button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('quote', false)" title="引用">"</button>
          </div>
          <textarea 
            v-model="detailContent" 
            class="rich-editor detail-editor" 
            :placeholder="selectedDetailId === 'detail-root' ? '点击左侧【细纲】选择一个细纲进行编辑，或点击【新增细纲】创建新的细纲...' : '在这里输入细纲内容...'"
            :disabled="selectedDetailId === 'detail-root'"
          ></textarea>
        </div>
        <div class="detail-footer">
          <span class="word-count">{{ detailContent.length }} 字符</span>
          <ElButton 
            :icon="Delete" 
            size="small" 
            type="danger" 
            v-if="selectedDetailId && selectedDetailId !== 'detail-root'" 
            @click="deleteDetailItem(selectedDetailId)"
          >删除</ElButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.outline-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative; /* 为红绿灯区域提供定位基准 */
  background: #fff;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-top: 8px; /* 红绿灯需要一点顶部空间 */
  background: #faf8f5;
  border-bottom: 1px solid #e8e4dc;
  position: relative; /* 为红绿灯区域提供定位基准 */
}

.traffic-lights-area {
  position: absolute;
  top: 8px;
  left: 16px;
  width: 70px;
  height: 32px;
  flex-shrink: 0;
  /* pointer-events: none; 让点击事件穿透，不影响拖动 */
  /* macOS红绿灯按钮区域 */
}

.header-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.save-status.saved {
  color: #2e7d32;
}

.save-status.saving {
  color: #1976d2;
}

.save-status.error {
  color: #d32f2f;
}

.status-icon {
  font-size: 14px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.retry-btn {
  border: none;
  background: none;
  cursor: pointer;
  color: #d32f2f;
  padding: 2px;
  /* -webkit-app-region: drag !important;  */
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  /* -webkit-app-region: drag !important; */
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.close-icon {
  font-size: 18px;
  color: #666;
}

/* 标签栏 */
.page-tabs {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  background: #faf8f5;
  border-bottom: 1px solid #e8e4dc;
}

.page-tab {
  padding: 8px 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
  /* -webkit-app-region: drag !important; */
}

.page-tab:hover {
  background: rgba(0, 0, 0, 0.05);
}

.page-tab.active {
  background: #c45c3e;
  color: white;
  font-weight: 500;
}

/* 大纲容器 */
.outline-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.outline-sidebar {
  flex-shrink: 0;
  width: 260px;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  background: #faf8f5;
}

.search-box {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #e8e4dc;
}

.search-icon {
  font-size: 14px;
  color: #999;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  outline: none;
}

.outline-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
  /* -webkit-app-region: drag !important; */
}

.tree-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.tree-item.active {
  background: rgba(196, 92, 62, 0.1);
  color: #c45c3e;
}

.root-item {
  font-weight: 600;
  color: #333;
}

.chapter-item {
  padding-left: 24px;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  font-size: 12px;
  color: #999;
}

.item-title {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  display: none;
  border: none;
  background: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  /* -webkit-app-region: drag !important; */
}

.tree-item:hover .delete-btn {
  display: block;
}

.delete-btn:hover {
  color: #d32f2f;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid #e8e4dc;
}

.new-btn {
  width: 100%;
  /* -webkit-app-region: drag !important; */
}

.outline-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
  min-height: 0;
}

.detail-title {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.detail-title:focus {
  outline: none;
  border-color: #c45c3e;
}

.detail-title:disabled {
  background: #f5f3ef;
  color: #999;
}

.rich-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #faf8f5;
  border-bottom: 1px solid #e8e4dc;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  /* -webkit-app-region: drag !important; */
}

.toolbar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e8e4dc;
  margin: 0 4px;
}

.rich-editor {
  flex: 1;
  padding: 12px;
  border: none;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
  /* -webkit-app-region: drag !important; */
}

.rich-editor:disabled {
  background: #faf8f5;
  color: #999;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.word-count {
  font-size: 12px;
  color: #999;
}
</style>