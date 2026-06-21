<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import type { Work, OutlineItem, Character, Inspiration } from "../App.vue";
import { Search, Delete, Plus, ArrowDown, ArrowRight, User, Close } from "@element-plus/icons-vue";
import { ElButton, ElMessageBox, ElMessage } from "element-plus";

// 从 URL 参数获取数据
const urlParams = new URLSearchParams(window.location.hash.slice(1));
const workId = ref(urlParams.get("workId") || "");
const viewType = ref(urlParams.get("viewType") || "outline");
const workTitle = ref(decodeURIComponent(urlParams.get("title") || ""));

// 数据状态
const work = ref<Work | null>(null);
const saveStatus = ref<"idle" | "saved" | "saving" | "error">("idle");
const saveTimeout = ref<number | null>(null);
const outlineItems = ref<OutlineItem[]>([]);
const characters = ref<Character[]>([]);
const inspirations = ref<Inspiration[]>([]);
const descriptionContent = ref("");

// 大纲相关
const selectedItemId = ref<string | null>(null);
const outlineTitle = ref("");
const outlineContent = ref("");
const searchQuery = ref("");
const expandedItems = ref<Set<string>>(new Set(["outline-root"]));

// 角色相关
const selectedCharacter = ref<Character | null>(null);
const editingCharacter = ref<Character | null>(null);
const roleOptions = [
  { value: "protagonist", label: "主要角色" },
  { value: "supporting", label: "次要角色" },
  { value: "antagonist", label: "反派" },
  { value: "other", label: "其他" },
];

const colors = ["#c45c3e", "#4facfe", "#43e97b", "#f093fb", "#fa709a", "#a18cd1"];

const getRoleName = (role: string) => {
  const found = roleOptions.find((r: { value: string }) => r.value === role);
  return found?.label || role;
};

// 按角色类型分组
const groupedCharacters = computed(() => {
  const groups: { role: string; label: string; chars: Character[] }[] = [];
  
  roleOptions.forEach(option => {
    const chars = characters.value.filter((c: Character) => c.role === option.value);
    if (chars.length > 0) {
      groups.push({ role: option.value, label: option.label, chars });
    }
  });
  
  return groups;
});

// 获取大纲子项
const getChildren = (parentId: string | null) => {
  // 如果是outline-root，获取所有章纲（parentId为outline-root的项）
  if (parentId === "outline-root") {
    return outlineItems.value.filter((item: OutlineItem) => item.parentId === "outline-root").sort((a: OutlineItem, b: OutlineItem) => a.order - b.order);
  }
  return [];
};

// 切换展开状态
const toggleExpand = (item: OutlineItem) => {
  if (expandedItems.value.has(item.id)) {
    expandedItems.value.delete(item.id);
  } else {
    expandedItems.value.add(item.id);
  }
};

// 选择大纲项
const selectOutlineItem = (item: OutlineItem) => {
  selectedItemId.value = item.id;
  outlineTitle.value = item.title;
  outlineContent.value = item.content;
};

// 选择根大纲
const selectRootOutline = () => {
  selectedItemId.value = "outline-root";
  outlineTitle.value = "大纲";
  outlineContent.value = "";
};

// 格式化文本（用于富文本模式下的Markdown格式化）
const formatText = (type: string) => {
  if (selectedItemId.value === "outline-root") return;
  
  const textarea = document.querySelector('.rich-editor') as HTMLTextAreaElement;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = outlineContent.value.substring(start, end);
  
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
  
  outlineContent.value = outlineContent.value.substring(0, start) + formattedText + outlineContent.value.substring(end);
  
  // 更新选中位置
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
  }, 0);
};

// 新建大纲项
const addOutlineItem = () => {
  const parentId = selectedItemId.value || "outline-root";
  const newItem: OutlineItem = {
    id: Math.random().toString(36).substring(2, 11),
    title: "新章纲",
    content: "",
    parentId: parentId,
    order: outlineItems.value.filter((i: OutlineItem) => i.parentId === parentId).length,
    expanded: false,
  };
  outlineItems.value.push(newItem);
  selectedItemId.value = newItem.id;
  outlineTitle.value = newItem.title;
  outlineContent.value = newItem.content;
  
  // 自动展开父节点
  if (parentId !== "outline-root") {
    expandedItems.value.add(parentId);
  }
  
  // 保存到本地
  saveOutlineToFile();
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
    
    // 删除选中项及其子项
    const idsToDelete = new Set<string>();
    const collectIds = (id: string) => {
      idsToDelete.add(id);
      outlineItems.value.filter(i => i.parentId === id).forEach(child => collectIds(child.id));
    };
    collectIds(itemId);
    
    outlineItems.value = outlineItems.value.filter(i => !idsToDelete.has(i.id));
    
    if (selectedItemId.value && idsToDelete.has(selectedItemId.value)) {
      selectedItemId.value = null;
      outlineTitle.value = "";
      outlineContent.value = "";
    }
    
    ElMessage.success('删除成功');
    saveOutlineToFile();
  } catch {
    // 用户取消删除
  }
};

// 保存大纲到文件
const saveOutlineToFile = async () => {
  if (!workId.value) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    
    // 确保工作目录存在
    await mkdir(workFolder, { recursive: true });
    
    // 保存大纲文件
    const outlineFolder = await join(workFolder, "大纲");
    await mkdir(outlineFolder, { recursive: true });
    
    // 将大纲数据转换为 Markdown 格式保存
    const generateMarkdown = (items: OutlineItem[], parentId: string | null, level: number = 0): string => {
      let md = "";
      const children = items.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);
      
      children.forEach(item => {
        // 跳过根节点"大纲"，只保存章纲内容
        if (item.id === "outline-root") return;
        
        const prefix = "#".repeat(Math.min(level + 1, 6));
        md += `${prefix} ${item.title}\n\n`;
        if (item.content) {
          // 将内容中的标题格式转义，避免被误解析
          const escapedContent = item.content.replace(/^#{1,6}\s/gm, '\\#');
          md += `${escapedContent}\n\n`;
        }
        md += generateMarkdown(items, item.id, level + 1);
      });
      
      return md;
    };
    
    const outlinePath = await join(outlineFolder, "大纲.md");
    // 从根节点开始生成，但跳过根节点本身
    const outlineMd = generateMarkdown(outlineItems.value, "outline-root", 0);
    await writeTextFile(outlinePath, outlineMd);
    
    saveStatus.value = "saved";
    console.log("大纲保存成功");
  } catch (error) {
    console.error("保存大纲失败:", error);
    saveStatus.value = "error";
  }
};

// 从文件加载大纲
const loadOutlineFromFile = async () => {
  if (!workId.value) return;
  
  try {
    const { readTextFile, exists } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    const outlineFolder = await join(workFolder, "大纲");
    const outlinePath = await join(outlineFolder, "大纲.md");
    
    // 检查大纲文件是否存在
    if (await exists(outlinePath)) {
      const content = await readTextFile(outlinePath);
      // 解析 Markdown 为大纲结构
      outlineItems.value = parseMarkdownToOutline(content);
    } else {
      // 创建默认的大纲结构
      outlineItems.value = createDefaultOutline();
      // 保存默认大纲
      await saveOutlineToFile();
    }
    
    // 默认选中第一个大纲项
    if (outlineItems.value.length > 0) {
      const firstItem = outlineItems.value.find(i => i.parentId === "outline-root");
      if (firstItem) {
        selectOutlineItem(firstItem);
      }
    }
  } catch (error) {
    console.error("加载大纲失败:", error);
    outlineItems.value = createDefaultOutline();
  }
};

// 解析 Markdown 为大纲结构
const parseMarkdownToOutline = (md: string): OutlineItem[] => {
  const items: OutlineItem[] = [];
  
  // 添加根节点
  items.push({
    id: "outline-root",
    title: "大纲",
    content: "",
    parentId: null,
    order: 0,
    expanded: true,
  });
  
  const lines = md.split('\n');
  let currentItem: OutlineItem | null = null;
  let contentBuffer: string[] = [];
  
  lines.forEach((line, index) => {
    // 匹配标题行（非转义的）
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    const isEscaped = line.match(/^\\#{1,6}\s+/);
    
    if (match && !isEscaped) {
      // 遇到新标题时，先保存上一个项的内容
      if (currentItem && contentBuffer.length > 0) {
        // 将转义的标题格式还原
        currentItem.content = contentBuffer.join('\n').replace(/^\\#{1,6}\s/gm, '#');
        contentBuffer = [];
      }
      
      // 创建新项
      currentItem = {
        id: Math.random().toString(36).substring(2, 11),
        title: match[2].trim(),
        content: "",
        parentId: "outline-root",
        order: items.filter(i => i.parentId === "outline-root").length,
        expanded: false,
      };
      
      items.push(currentItem);
    } else if (currentItem && line.trim()) {
      // 非标题行，作为内容收集
      contentBuffer.push(line);
    }
  });
  
  // 保存最后一项的内容
  if (currentItem && contentBuffer.length > 0) {
    // 将转义的标题格式还原
    currentItem.content = contentBuffer.join('\n').replace(/^\\#{1,6}\s/gm, '#').trim();
  }
  
  return items;
};

// 创建默认大纲结构
const createDefaultOutline = (): OutlineItem[] => {
  return [
    {
      id: "outline-root",
      title: "大纲",
      content: "",
      parentId: null,
      order: 0,
      expanded: true,
    },
  ];
};

// 监听大纲内容变化，自动保存
watch([outlineTitle, outlineContent], () => {
  // 更新内存中的数据
  if (selectedItemId.value) {
    const item = outlineItems.value.find(i => i.id === selectedItemId.value);
    if (item) {
      item.title = outlineTitle.value;
      item.content = outlineContent.value;
    }
  }
  
  // 立即显示保存状态
  saveStatus.value = "saving";
  
  // 防抖保存
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }
  saveTimeout.value = window.setTimeout(() => {
    saveOutlineToFile();
  }, 2000);
});

// 角色相关函数
const addCharacter = () => {
  if (!work.value) return;
  const newCharacter: Character = {
    id: Math.random().toString(36).substring(2, 11),
    name: "新角色",
    role: "supporting",
    avatar: "",
    description: "",
    personality: "",
    background: "",
    other: "",
    color: colors[work.value.characters.length % colors.length],
    updatedAt: Date.now(),
  };
  work.value.characters.push(newCharacter);
  characters.value = work.value.characters;
  editingCharacter.value = newCharacter;
  selectedCharacter.value = newCharacter;
  saveCharactersToFile();
};

const deleteCharacter = async (charId: string) => {
  const char = characters.value.find(c => c.id === charId);
  if (!char) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除角色 "${char.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 删除本地角色文件
    try {
      const { join } = await import("@tauri-apps/api/path");
      const { remove, exists } = await import("@tauri-apps/plugin-fs");
      
      const savePath = "/Users/zmh/Downloads/writer";
      const sanitizeFileName = (name: string) => {
        return name.replace(/[\\/:*?"<>|]/g, "_").trim();
      };
      
      const charPath = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"), "角色", `${sanitizeFileName(char.name || "未命名角色")}.md`);
      if (await exists(charPath)) {
        await remove(charPath);
        console.log(`已删除角色文件: ${charPath}`);
      }
    } catch (error) {
      console.error('删除角色文件失败:', error);
    }
    
    characters.value = characters.value.filter(c => c.id !== charId);
    if (selectedCharacter.value?.id === charId) {
      selectedCharacter.value = null;
    }
    if (editingCharacter.value?.id === charId) {
      editingCharacter.value = null;
    }
    
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

const selectCharacter = (char: Character) => {
  selectedCharacter.value = char;
  editingCharacter.value = char;
};

// 保存角色到文件
const saveCharactersToFile = async () => {
  if (!workId.value) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    const charsFolder = await join(workFolder, "角色");
    await mkdir(charsFolder, { recursive: true });
    
    // 保存每个角色到单独的文件
    for (const char of characters.value) {
      const charPath = await join(charsFolder, `${sanitizeFileName(char.name || "未命名角色")}.md`);
      const charContent = `# ${char.name || "未命名角色"}\n\n角色类型: ${getRoleName(char.role)}\n\n背景:\n${char.background || ""}\n\n性格:\n${char.personality || ""}\n\n外貌:\n${char.description || ""}\n\n其他:\n${char.other || ""}`;
      await writeTextFile(charPath, charContent);
    }
    
    saveStatus.value = "saved";
  } catch (error) {
    console.error("保存角色失败:", error);
    saveStatus.value = "error";
  }
};

// 简介相关
const saveDescriptionToFile = async () => {
  if (!workId.value) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    const descPath = await join(workFolder, "简介.md");
    await writeTextFile(descPath, descriptionContent.value);
    
    saveStatus.value = "saved";
  } catch (error) {
    console.error("保存简介失败:", error);
    saveStatus.value = "error";
  }
};

// 灵感相关
const addInspiration = () => {
  if (!work.value) return;
  const newInspiration: Inspiration = {
    id: Math.random().toString(36).substring(2, 11),
    title: "新灵感",
    content: "",
    createdAt: Date.now(),
    tags: [],
  };
  work.value.inspirations.push(newInspiration);
  inspirations.value = work.value.inspirations;
  editingInspiration.value = newInspiration;
};

const deleteInspiration = async (inspId: string) => {
  const insp = inspirations.value.find(i => i.id === inspId);
  if (!insp) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除灵感 "${insp.title}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 删除本地灵感文件
    try {
      const { join } = await import("@tauri-apps/api/path");
      const { remove, exists } = await import("@tauri-apps/plugin-fs");
      
      const savePath = "/Users/zmh/Downloads/writer";
      const sanitizeFileName = (name: string) => {
        return name.replace(/[\\/:*?"<>|]/g, "_").trim();
      };
      
      const inspPath = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"), "灵感", `${sanitizeFileName(insp.title || "未命名灵感")}.md`);
      if (await exists(inspPath)) {
        await remove(inspPath);
        console.log(`已删除灵感文件: ${inspPath}`);
      }
    } catch (error) {
      console.error('删除灵感文件失败:', error);
    }
    
    inspirations.value = inspirations.value.filter(i => i.id !== inspId);
    if (editingInspiration.value?.id === inspId) {
      editingInspiration.value = null;
    }
    
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

// 保存灵感到文件
const saveInspirationsToFile = async () => {
  if (!workId.value) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    const inspFolder = await join(workFolder, "灵感");
    await mkdir(inspFolder, { recursive: true });
    
    for (const insp of inspirations.value) {
      const inspPath = await join(inspFolder, `${sanitizeFileName(insp.title || "未命名灵感")}.md`);
      await writeTextFile(inspPath, `# ${insp.title}\n\n${insp.content}`);
    }
    
    saveStatus.value = "saved";
  } catch (error) {
    console.error("保存灵感失败:", error);
    saveStatus.value = "error";
  }
};

const editingInspiration = ref<Inspiration | null>(null);

const closeWindow = () => {
  window.close();
};

// 重试保存
const retrySave = async () => {
  saveStatus.value = "saving";
  if (viewType.value === "outline") {
    await saveOutlineToFile();
  } else if (viewType.value === "character") {
    await saveCharactersToFile();
  } else if (viewType.value === "description") {
    await saveDescriptionToFile();
  } else if (viewType.value === "inspiration") {
    await saveInspirationsToFile();
  }
};

onMounted(async () => {
  // 初始化工作数据
  work.value = {
    id: workId.value,
    title: workTitle.value,
    description: "",
    genre: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [],
    volumes: [],
    characters: [],
    outline: [],
    inspirations: [],
  };
  
  // 根据视图类型加载数据
  if (viewType.value === "outline") {
    await loadOutlineFromFile();
  } else if (viewType.value === "character") {
    characters.value = work.value.characters;
  } else if (viewType.value === "description") {
    descriptionContent.value = work.value.description || "";
    // 简介初始状态为已保存
    saveStatus.value = "saved";
  } else if (viewType.value === "inspiration") {
    inspirations.value = work.value.inspirations;
  }
  
  // 监听角色内容变化
  if (viewType.value === "character") {
    watch([characters, editingCharacter], () => {
      if (editingCharacter.value) {
        saveStatus.value = "saving";
        if (saveTimeout.value) clearTimeout(saveTimeout.value);
        saveTimeout.value = window.setTimeout(() => {
          saveCharactersToFile();
        }, 2000);
      }
    }, { deep: true });
  }
  
  // 监听灵感内容变化
  if (viewType.value === "inspiration") {
    watch([inspirations, editingInspiration], () => {
      if (editingInspiration.value) {
        saveStatus.value = "saving";
        if (saveTimeout.value) clearTimeout(saveTimeout.value);
        saveTimeout.value = window.setTimeout(() => {
          saveInspirationsToFile();
        }, 2000);
      }
    }, { deep: true });
  }
});
</script>

<template>
  <div class="view-window">
    <!-- 标题栏 -->
    <div class="view-header">
      <div class="header-left">
        <span class="header-icon">
          <span v-if="viewType === 'outline'">📋</span>
          <span v-else-if="viewType === 'character'">👤</span>
          <span v-else-if="viewType === 'description'">📝</span>
          <span v-else>💡</span>
        </span>
        <span class="header-title">{{ viewType === 'outline' ? '大纲' : viewType === 'character' ? '角色' : viewType === 'description' ? '简介' : '灵感' }}</span>
      </div>
      <div class="header-right">
        <div v-if="saveStatus !== 'idle' && saveStatus !== 'saved' && viewType !== 'description'" class="save-status" :class="saveStatus">
          <span class="status-icon">
            <span v-if="saveStatus === 'saved'">✓</span>
            <span v-else-if="saveStatus === 'saving'" class="spinner">⟳</span>
            <span v-else>✗</span>
          </span>
          <span class="status-text">
            <span v-if="saveStatus === 'saved'">已保存</span>
            <span v-else-if="saveStatus === 'saving'">正在保存...</span>
            <span v-else>保存失败</span>
          </span>
          <button v-if="saveStatus === 'error'" class="retry-btn" @click="retrySave" title="重新保存">
            <span class="retry-icon">⟳</span>
          </button>
        </div>
        <button class="close-btn" @click="closeWindow">
          <Close class="close-icon" />
        </button>
      </div>
    </div>
    
    <!-- 大纲视图 -->
    <div v-if="viewType === 'outline'" class="outline-container">
      <div class="outline-sidebar">
        <div class="search-box">
          <Search class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="搜索大纲" class="search-input" />
        </div>
        <div class="outline-tree">
          <!-- 总纲：只有一个默认"大纲"文件夹 -->
          <div class="tree-item root-item" :class="{ active: selectedItemId === 'outline-root' }" @click="selectRootOutline">
            <span class="folder-icon">📁</span>
            <span class="item-title">大纲</span>
          </div>
          <!-- 章纲列表 -->
          <div class="chapter-list">
            <template v-for="item in getChildren('outline-root')" :key="item.id">
              <div class="tree-item chapter-item" :class="{ active: selectedItemId === item.id }" @click="selectOutlineItem(item)">
                <span class="expand-icon" @click.stop="toggleExpand(item)">
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
          <ElButton :icon="Plus" size="small" class="new-btn" @click="addOutlineItem">新增章纲</ElButton>
        </div>
      </div>
      
      <div class="outline-detail">
        <input v-model="outlineTitle" class="detail-title" placeholder="章纲标题" :disabled="selectedItemId === 'outline-root'" />
        <div class="rich-editor-container">
          <!-- 富文本工具栏 -->
          <div class="editor-toolbar">
            <button class="toolbar-btn" @click="formatText('bold')" title="粗体"><b>B</b></button>
            <button class="toolbar-btn" @click="formatText('italic')" title="斜体"><i>I</i></button>
            <button class="toolbar-btn" @click="formatText('underline')" title="下划线"><u>U</u></button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('h1')" title="标题1">H1</button>
            <button class="toolbar-btn" @click="formatText('h2')" title="标题2">H2</button>
            <button class="toolbar-btn" @click="formatText('h3')" title="标题3">H3</button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('ul')" title="无序列表">•</button>
            <button class="toolbar-btn" @click="formatText('ol')" title="有序列表">1.</button>
            <span class="toolbar-divider"></span>
            <button class="toolbar-btn" @click="formatText('quote')" title="引用">"</button>
          </div>
          <textarea 
            v-model="outlineContent" 
            class="rich-editor" 
            :placeholder="selectedItemId === 'outline-root' ? '点击左侧【大纲】选择一个章纲进行编辑，或点击【新增章纲】创建新的章纲...' : '在这里输入章纲内容...'"
            :disabled="selectedItemId === 'outline-root'"
          ></textarea>
        </div>
        <div class="detail-footer">
          <span class="word-count">{{ outlineContent.length }} 字符</span>
          <ElButton 
            :icon="Delete" 
            size="small" 
            type="danger" 
            v-if="selectedItemId && selectedItemId !== 'outline-root'" 
            @click="deleteOutlineItem(selectedItemId)"
          >删除</ElButton>
        </div>
      </div>
    </div>
    
    <!-- 角色视图 -->
    <div v-else-if="viewType === 'character'" class="character-container">
      <div class="character-sidebar">
        <div v-for="group in groupedCharacters" :key="group.role" class="character-group">
          <div class="group-header">
            <span class="group-icon">📁</span>
            <span class="group-title">{{ group.label }}</span>
          </div>
          <div class="group-list">
            <div
              v-for="char in group.chars"
              :key="char.id"
              class="group-item"
              :class="{ active: selectedCharacter?.id === char.id }"
              @click="selectCharacter(char)"
            >
              <span class="item-name">{{ char.name || "未命名" }}</span>
            </div>
          </div>
        </div>
        <div v-if="groupedCharacters.length === 0" class="empty-sidebar">暂无角色</div>
      </div>
      
      <div class="character-detail">
        <template v-if="editingCharacter">
          <div class="detail-tabs">
            <button class="tab-btn active">角色</button>
          </div>
          <div class="detail-content">
            <div class="character-title-row">
              <input v-model="editingCharacter.name" class="character-name-input" placeholder="角色名称" />
              <select v-model="editingCharacter.role" class="role-select">
                <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="avatar-section">
              <div class="avatar-placeholder" :style="{ background: editingCharacter.color }">
                <User v-if="!editingCharacter.avatar" />
                <img v-else :src="editingCharacter.avatar" class="avatar-img" />
              </div>
            </div>
            <div class="info-section">
              <div class="info-item">
                <span class="info-label">背景</span>
                <textarea v-model="editingCharacter.background" class="info-textarea" placeholder="角色背景故事..."></textarea>
              </div>
              <div class="info-item">
                <span class="info-label">性格</span>
                <textarea v-model="editingCharacter.personality" class="info-textarea" placeholder="角色性格特点..."></textarea>
              </div>
              <div class="info-item">
                <span class="info-label">外貌</span>
                <textarea v-model="editingCharacter.description" class="info-textarea" placeholder="角色外貌描述..."></textarea>
              </div>
              <div class="info-item">
                <span class="info-label">其他</span>
                <textarea v-model="editingCharacter.other" class="info-textarea" placeholder="其他信息..."></textarea>
              </div>
            </div>
          </div>
          <div class="detail-footer">
            <span class="word-count">{{ (editingCharacter.background?.length || 0) + (editingCharacter.personality?.length || 0) + (editingCharacter.description?.length || 0) + (editingCharacter.other?.length || 0) }} 字符</span>
            <div class="footer-actions">
              <ElButton :icon="Delete" size="small" type="danger" @click="deleteCharacter(editingCharacter.id)">删除</ElButton>
            </div>
          </div>
        </template>
      </div>
      <div class="character-toolbar">
        <div class="search-box">
          <Search class="search-icon" />
          <input type="text" placeholder="搜索角色" class="search-input" />
        </div>
        <ElButton :icon="Plus" size="small" class="new-btn" @click="addCharacter">新建</ElButton>
      </div>
    </div>
    
    <!-- 简介视图 -->
    <div v-else-if="viewType === 'description'" class="description-container">
      <div class="description-header">
        <h2 class="description-title">书籍简介</h2>
        <div class="description-status">
          <span class="status-text">{{ saveStatus === 'saving' ? '正在保存...' : '已保存' }}</span>
          <button class="save-btn" @click="saveDescriptionToFile" :disabled="saveStatus === 'saving'" title="保存到本地">
            <span class="save-icon" :class="{ spinning: saveStatus === 'saving' }">⟳</span>
          </button>
        </div>
      </div>
      <textarea v-model="descriptionContent" class="description-textarea" placeholder="请输入书籍简介..."></textarea>
      <div class="description-footer">
        <span class="word-count">{{ descriptionContent.length }} 字符</span>
      </div>
    </div>
    
    <!-- 灵感视图 -->
    <div v-else-if="viewType === 'inspiration'" class="inspiration-container">
      <div class="inspiration-sidebar">
        <div v-for="insp in inspirations" :key="insp.id" class="inspiration-item" :class="{ active: editingInspiration?.id === insp.id }" @click="editingInspiration = insp">
          <span class="inspiration-title">{{ insp.title }}</span>
        </div>
      </div>
      <div class="inspiration-detail">
        <template v-if="editingInspiration">
          <input v-model="editingInspiration.title" class="detail-title" placeholder="灵感标题" />
          <textarea v-model="editingInspiration.content" class="detail-content" placeholder="灵感内容..."></textarea>
          <div class="detail-footer">
            <span class="word-count">{{ editingInspiration.content?.length || 0 }} 字符</span>
            <ElButton :icon="Delete" size="small" type="danger" @click="deleteInspiration(editingInspiration.id)">删除</ElButton>
          </div>
        </template>
      </div>
      <div class="inspiration-toolbar">
        <ElButton :icon="Plus" size="small" class="new-btn" @click="addInspiration">新建</ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fdf5e6;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #f8f4eb 0%, #f5efe6 100%);
  border-bottom: 1px solid #e8e4dc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

.retry-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: #c62828;
    color: white;
  }
}

.retry-icon {
  font-size: 14px;
  
  &:hover {
    animation: spin 0.5s linear infinite;
  }
}

.status-icon .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #e8e4dc;
}

.close-icon {
  font-size: 16px;
  color: #666;
}

/* 大纲视图 */
.outline-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.outline-sidebar {
  width: 250px;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  background: #faf7f0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e4dc;
}

.search-icon {
  font-size: 14px;
  color: #999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
}

.outline-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: all 0.2s;
  
  &:hover {
    background: #f0ebe1;
  }
  
  &.active {
    background: #ffe4d4;
    color: #8b4513;
    font-weight: 500;
  }
  
  &.child {
    padding-left: 24px;
  }
}

.root-item {
  background: #f5f1e8;
  font-weight: 600;
  margin-bottom: 8px;
  border-bottom: 1px solid #e8e4dc;
  padding: 12px 10px;
  
  &:hover {
    background: #efe9de;
  }
  
  &.active {
    background: #ffe4d4;
  }
}

.folder-icon {
  margin-right: 8px;
  font-size: 14px;
}

.chapter-list {
  margin-left: 8px;
}

.chapter-item {
  padding-left: 24px;
  position: relative;
  
  .delete-btn {
    display: none;
    position: absolute;
    right: 8px;
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
    
    &:hover {
      background: #ff2222;
    }
  }
  
  &:hover .delete-btn {
    display: block;
  }
}

.expand-icon {
  width: 14px;
  height: 14px;
  color: #999;
  margin-right: 6px;
  flex-shrink: 0;
}

.item-title {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-children {
  margin-left: 8px;
}

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid #e8e4dc;
}

.new-btn {
  width: 100%;
  background: #4caf50;
  border: none;
  color: white;
  font-weight: 500;
  
  &:hover {
    background: #45a049;
  }
}

.outline-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #fff;
}

.detail-title {
  padding: 10px;
  font-size: 18px;
  font-weight: 600;
  border: none;
  background: transparent;
  border-bottom: 2px solid #e8e4dc;
  outline: none;
  margin-bottom: 16px;
  color: #333;
  
  &:focus {
    border-bottom-color: #8b7355;
  }
  
  &:disabled {
    background: #faf7f0;
    cursor: not-allowed;
    color: #999;
  }
}

.rich-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e4dc;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #faf7f0;
  border-bottom: 1px solid #e8e4dc;
  gap: 4px;
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #e8e4dc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
  
  &:hover {
    background: #f0ebe1;
    border-color: #8b7355;
  }
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e8e4dc;
  margin: 0 4px;
}

.rich-editor {
  flex: 1;
  padding: 16px;
  font-size: 14px;
  line-height: 1.8;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  color: #333;
  
  &:focus {
    background: #fafafa;
  }
  
  &:disabled {
    background: #faf7f0;
    cursor: not-allowed;
    color: #999;
  }
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-top: 12px;
  border-top: 1px solid #e8e4dc;
}

.word-count {
  font-size: 12px;
  color: #999;
  font-family: "Monaco", "Menlo", monospace;
}

/* 角色视图 */
.character-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.character-sidebar {
  width: 200px;
  border-right: 1px solid #e8e4dc;
  overflow-y: auto;
  background: #faf7f0;
}

.character-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: #999;
  background: #f5f1e8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-icon {
  font-size: 10px;
}

.group-list {
  padding: 4px 0;
}

.group-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f1e8;
  }
  
  &.active {
    background: #f0ebe1;
    color: #333;
    font-weight: 500;
  }
}

.empty-sidebar {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.character-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.detail-tabs {
  display: flex;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e4dc;
}

.tab-btn {
  padding: 6px 0;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  
  &.active {
    color: #333;
    font-weight: 500;
    border-bottom-color: #8b7355;
  }
}

.detail-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.character-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.character-name-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 18px;
  font-weight: 600;
  border: none;
  background: transparent;
  outline: none;
  color: #333;
  border-bottom: 2px solid #e8e4dc;
  
  &:focus {
    border-bottom-color: #8b7355;
  }
}

.role-select {
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  outline: none;
  cursor: pointer;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  font-weight: 500;
}

.info-textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  background: #fff;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #8b7355;
  }
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.character-toolbar {
  padding: 12px 16px;
  background: #faf7f0;
  border-top: 1px solid #e8e4dc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 简介视图 */
.description-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #fff;
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.description-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.description-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 12px;
  color: #2e7d32;
}

.save-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #e8e4dc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #f0ebe1;
    border-color: #8b7355;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.save-icon {
  font-size: 16px;
  color: #666;
  
  &.spinning {
    animation: spin 1s linear infinite;
  }
}

.description-textarea {
  flex: 1;
  padding: 16px;
  font-size: 14px;
  line-height: 1.8;
  border: 1px solid #e8e4dc;
  border-radius: 6px;
  background: #fff;
  outline: none;
  resize: none;
  font-family: inherit;
  color: #333;
  
  &:focus {
    border-color: #8b7355;
  }
}

.description-footer {
  padding: 12px 0;
  text-align: right;
}

/* 灵感视图 */
.inspiration-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.inspiration-sidebar {
  width: 220px;
  border-right: 1px solid #e8e4dc;
  overflow-y: auto;
  background: #faf7f0;
}

.inspiration-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #e8e4dc;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f1e8;
  }
  
  &.active {
    background: #ffe4d4;
  }
}

.inspiration-title {
  font-size: 13px;
  color: #333;
}

.inspiration-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #fff;
}

.detail-content {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  background: #fff;
  outline: none;
  resize: none;
  font-family: inherit;
}

.inspiration-toolbar {
  padding: 12px 16px;
  background: #faf7f0;
  border-top: 1px solid #e8e4dc;
}
</style>
