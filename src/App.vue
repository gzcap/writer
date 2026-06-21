<script setup lang="ts">
/**
 * 主应用组件
 * 负责管理应用状态、视图切换、数据持久化
 * 
 * 代码结构：
 * 1. 导入依赖和类型定义
 * 2. 初始化应用状态
 * 3. 数据加载和保存逻辑
 * 4. 作品管理逻辑（创建、删除、更新）
 * 5. 章节和卷管理逻辑
 * 6. UI交互逻辑（模态框、标签页等）
 * 7. 自动保存和增量保存逻辑
 */

import { provide, reactive, computed, onMounted, onUnmounted } from "vue";

// 导入组件
import HomeView from "./components/HomeView.vue";
import EditorView from "./components/EditorView.vue";
import OutlineModal from "./components/OutlineModal.vue";
import CharacterModal from "./components/CharacterModal.vue";
import InspirationModal from "./components/InspirationModal.vue";
import SettingModal from "./components/SettingModal.vue";
import DescriptionModal from "./components/DescriptionModal.vue";
import ViewWindow from "./components/ViewWindow.vue";

// 导入类型定义
import type { Work, Volume, Chapter, Character, OutlineItem, Inspiration, Tab, AppState, ModifiedItems } from "./types";

// 导入工具函数
import { generateId, sanitizeFileName, debounce, numberToChinese } from "./utils/utils";

// 导入服务模块
import { createWorkService } from "./utils/workService";
import { createAppState, createAppStore } from "./store/store";

// ==================== 2. 初始化应用状态 ====================

const appState = reactive<AppState>({
  works: [],
  currentWorkId: null,
  currentChapterId: null,
  view: "home",
  theme: "light",
  editorMode: "wysiwyg",
  dailyCount: 0,
  dailyTarget: 3000,
  tabs: [],
  currentTabId: null,
  showOutlineModal: false,
  showCharacterModal: false,
  showInspirationModal: false,
  showSettingModal: false,
  showDescriptionModal: false,
  showLocalSaveModal: false,
  savePath: "",
});

// ==================== 3. 数据加载和保存逻辑 ====================

/**
 * 加载应用数据
 * 从 localStorage 和文件系统加载应用设置和作品数据
 */
const loadData = () => {
  // 默认存储路径
  const defaultSavePath = "/Users/zmh/Downloads/writer";
  
  // 从 localStorage 加载设置
  const saved = localStorage.getItem("writer-data");
  if (saved) {
    const data = JSON.parse(saved);
    appState.dailyCount = data.dailyCount || 0;
    appState.dailyTarget = data.dailyTarget || 3000;
    appState.savePath = data.savePath || defaultSavePath;
  } else {
    appState.savePath = defaultSavePath;
  }
  
  // 尝试从文件系统加载书籍数据
  loadWorksFromFileSystem();
};

const loadWorksFromFileSystem = async () => {
  try {
    const { readDir, exists, mkdir } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    
    const savePath = appState.savePath;
    if (!savePath) {
      console.log('未设置保存路径');
      loadFromLocalStorage();
      return;
    }
    
    // 检查目录是否存在，不存在则创建
    const pathExists = await exists(savePath);
    if (!pathExists) {
      console.log('保存路径不存在，正在创建...');
      try {
        await mkdir(savePath, { recursive: true });
        console.log('保存路径已创建');
      } catch (mkdirError) {
        console.error('创建保存路径失败:', mkdirError);
        loadFromLocalStorage();
        return;
      }
    }
    
    // 读取目录下的所有文件夹（每个文件夹是一个作品）
    const entries = await readDir(savePath);
    const works: Work[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory && entry.name) {
        const workFolder = await join(savePath, entry.name);
        const work = await loadWorkFromFolder(workFolder, entry.name);
        if (work) {
          works.push(work);
        }
      }
    }
    
    if (works.length > 0) {
      appState.works = works;
      console.log(`已加载 ${works.length} 部作品`);
    } else {
      // 如果目录为空，创建默认示例
      console.log('目录为空，创建默认示例');
      createDefaultWork();
    }
  } catch (error) {
    console.error('从文件系统加载失败:', error);
    // 降级到 localStorage
    loadFromLocalStorage();
  }
};

const loadWorkFromFolder = async (folderPath: string, folderName: string): Promise<Work | null> => {
  try {
    const { readDir, readTextFile, exists } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    
    const work: Work = {
      id: generateId(),
      title: folderName,
      description: '',
      genre: '',
      volumes: [],
      chapters: [],
      characters: [],
      outline: [],
      inspirations: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // 读取简介
    const descPath = await join(folderPath, '简介.md');
    if (await exists(descPath)) {
      work.description = await readTextFile(descPath);
    }
    
    // 读取角色文件夹
    const charactersPath = await join(folderPath, '角色');
    if (await exists(charactersPath)) {
      const charEntries = await readDir(charactersPath);
      for (const entry of charEntries) {
        if (entry.isFile && entry.name?.endsWith('.md')) {
          const charFilePath = await join(charactersPath, entry.name);
          const charContent = await readTextFile(charFilePath);
          const char = parseCharacterFromMarkdown(charContent, entry.name);
          work.characters.push(char);
        }
      }
    }
    
    // 读取大纲文件夹
    const outlinePath = await join(folderPath, '大纲');
    if (await exists(outlinePath)) {
      const outlineEntries = await readDir(outlinePath);
      for (const entry of outlineEntries) {
        if (entry.isFile && entry.name?.endsWith('.md')) {
          const outlineFilePath = await join(outlinePath, entry.name);
          const outlineContent = await readTextFile(outlineFilePath);
          const outline = parseOutlineFromMarkdown(outlineContent, entry.name);
          work.outline.push(outline);
        }
      }
    }
    
    // 读取灵感文件夹
    const inspirationPath = await join(folderPath, '灵感');
    if (await exists(inspirationPath)) {
      const inspirationEntries = await readDir(inspirationPath);
      for (const entry of inspirationEntries) {
        if (entry.isFile && entry.name?.endsWith('.md')) {
          const inspirationFilePath = await join(inspirationPath, entry.name);
          const inspirationContent = await readTextFile(inspirationFilePath);
          const inspiration = parseInspirationFromMarkdown(inspirationContent, entry.name);
          work.inspirations.push(inspiration);
        }
      }
    }
    
    // 读取卷和章节
    const entries = await readDir(folderPath);
    const volumeFolders: { name: string; path: string }[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory && entry.name && entry.name !== '角色' && entry.name !== '大纲' && entry.name !== '灵感' && entry.name !== '设定') {
        volumeFolders.push({
          name: entry.name,
          path: await join(folderPath, entry.name)
        });
      }
    }
    
    // 按卷名中的数字排序
    volumeFolders.sort((a, b) => {
      const numA = extractVolumeNumber(a.name);
      const numB = extractVolumeNumber(b.name);
      return numA - numB;
    });
    
    for (const volFolder of volumeFolders) {
      const volume: Volume = {
        id: generateId(),
        title: volFolder.name,
        description: '',
        chapterIds: [],
        order: work.volumes.length,
      };
      
      // 读取卷信息文件（卷名.md）
      const volInfoPath = await join(volFolder.path, `${volFolder.name}.md`);
      if (await exists(volInfoPath)) {
        const volInfoContent = await readTextFile(volInfoPath);
        const lines = volInfoContent.split('\n');
        // 第一行是标题 # 卷名
        if (lines[0]?.startsWith('# ')) {
          volume.title = lines[0].substring(2).trim();
        }
        // 剩余内容是简介
        volume.description = lines.slice(2).join('\n').trim();
      }
      
      // 兼容旧的简介.md格式
      const volDescPath = await join(volFolder.path, '简介.md');
      if (await exists(volDescPath) && !await exists(volInfoPath)) {
        volume.description = await readTextFile(volDescPath);
      }
      
      const chapterEntries = await readDir(volFolder.path);
      // 按章节名中的数字排序
      const chapterFiles: { name: string; path: string }[] = [];
      for (const chapEntry of chapterEntries) {
        if (chapEntry.isFile && chapEntry.name?.endsWith('.md')) {
          // 过滤掉卷信息文件和简介.md
          if (chapEntry.name === `${volFolder.name}.md` || chapEntry.name === '简介.md') {
            continue;
          }
          chapterFiles.push({
            name: chapEntry.name,
            path: await join(volFolder.path, chapEntry.name)
          });
        }
      }
      
      chapterFiles.sort((a, b) => {
        const numA = extractChapterNumber(a.name);
        const numB = extractChapterNumber(b.name);
        return numA - numB;
      });
      
      for (const chapFile of chapterFiles) {
        const chapterContent = await readTextFile(chapFile.path);
        const chapter = parseChapterFromMarkdown(chapterContent, chapFile.name);
        work.chapters.push(chapter);
        volume.chapterIds.push(chapter.id);
      }
      
      work.volumes.push(volume);
    }
    
    return work;
  } catch (error) {
    console.error('加载作品失败:', error);
    return null;
  }
};

// 从卷名中提取数字（用于排序）
const extractVolumeNumber = (name: string): number => {
  // 匹配中文数字
  const chineseNumbers: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
  };
  
  // 匹配"第X卷"格式
  const chineseMatch = name.match(/第([一二三四五六七八九十]+)卷/);
  if (chineseMatch && chineseNumbers[chineseMatch[1]]) {
    return chineseNumbers[chineseMatch[1]];
  }
  
  // 匹配阿拉伯数字
  const numMatch = name.match(/第(\d+)卷/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  
  // 匹配文件夹名中的数字
  const anyNumMatch = name.match(/(\d+)/);
  if (anyNumMatch) {
    return parseInt(anyNumMatch[1], 10);
  }
  
  return 999; // 默认排在最后
};

// 从章节名中提取数字（用于排序）
const extractChapterNumber = (name: string): number => {
  // 匹配中文数字
  const chineseNumbers: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
    '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25, '二十六': 26, '二十七': 27, '二十八': 28, '二十九': 29, '三十': 30
  };
  
  // 匹配"第X章"格式
  const chineseMatch = name.match(/第([一二三四五六七八九十]+)章/);
  if (chineseMatch && chineseNumbers[chineseMatch[1]]) {
    return chineseNumbers[chineseMatch[1]];
  }
  
  // 匹配阿拉伯数字
  const numMatch = name.match(/第(\d+)章/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  
  // 匹配文件名中的数字
  const anyNumMatch = name.match(/(\d+)/);
  if (anyNumMatch) {
    return parseInt(anyNumMatch[1], 10);
  }
  
  return 999; // 默认排在最后
};

const parseChapterFromMarkdown = (content: string, fileName: string): Chapter => {
  // 尝试从内容中提取标题
  let title = fileName.replace(/\.md$/, '');
  let chapterContent = content;
  
  // 检查是否有标题行
  const lines = content.split('\n');
  const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
  if (titleMatch) {
    title = titleMatch[1].trim();
    // 移除标题行，保留剩余内容
    chapterContent = lines.slice(1).join('\n').trim();
  }
  
  const wordCount = chapterContent.replace(/\s/g, '').length;
  
  return {
    id: generateId(),
    title: title,
    content: chapterContent,
    wordCount: wordCount,
    chapterOutline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

const parseCharacterFromMarkdown = (content: string, fileName: string): Character => {
  const name = fileName.replace(/\.md$/, '');
  
  // 尝试解析角色属性
  const lines = content.split('\n');
  let role: 'protagonist' | 'supporting' | 'antagonist' | 'other' = 'other';
  let personality = '';
  let background = '';
  let other = '';
  let description = '';
  
  // 解析 Markdown 格式的角色信息
  for (const line of lines) {
    if (line.startsWith('角色类型:') || line.startsWith('**角色类型**:')) {
      const roleText = line.replace(/角色类型:|\*\*角色类型\*\*:/g, '').trim();
      if (roleText.includes('主角')) role = 'protagonist';
      else if (roleText.includes('反派')) role = 'antagonist';
      else if (roleText.includes('配角')) role = 'supporting';
    } else if (line.startsWith('性格:') || line.startsWith('**性格**:')) {
      personality = line.replace(/性格:|\*\*性格\*\*:/g, '').trim();
    } else if (line.startsWith('背景:') || line.startsWith('**背景**:')) {
      background = line.replace(/背景:|\*\*背景\*\*:/g, '').trim();
    } else if (line.startsWith('其他:') || line.startsWith('**其他**:')) {
      other = line.replace(/其他:|\*\*其他\*\*:/g, '').trim();
    } else if (line.startsWith('描述:') || line.startsWith('**描述**:')) {
      description = line.replace(/描述:|\*\*描述\*\*:/g, '').trim();
    } else if (!line.startsWith('#') && line.trim()) {
      // 其他内容作为描述
      if (!description) description = line.trim();
    }
  }
  
  return {
    id: generateId(),
    name: name,
    role: role,
    avatar: '',
    description: description || content,
    personality: personality,
    background: background,
    other: other,
    color: role === 'protagonist' ? '#c45c3e' : role === 'antagonist' ? '#d9534f' : '#666',
    updatedAt: Date.now(),
  };
};

const parseOutlineFromMarkdown = (content: string, fileName: string): OutlineItem => {
  const title = fileName.replace(/\.md$/, '');
  
  // 尝试从内容中提取标题
  const lines = content.split('\n');
  let actualTitle = title;
  let outlineContent = content;
  
  // 如果第一行是标题，使用它
  if (lines.length > 0 && lines[0].startsWith('#')) {
    actualTitle = lines[0].replace(/^#+\s*/, '').trim();
    outlineContent = lines.slice(1).join('\n').trim();
  }
  
  return {
    id: generateId(),
    title: actualTitle,
    content: outlineContent,
    parentId: null,
    order: 0,
    expanded: true,
  };
};

const parseInspirationFromMarkdown = (content: string, fileName: string): Inspiration => {
  const title = fileName.replace(/\.md$/, '');
  
  // 尝试从内容中提取标题和标签
  const lines = content.split('\n');
  let actualTitle = title;
  let inspirationContent = content;
  const tags: string[] = [];
  
  // 如果第一行是标题，使用它
  if (lines.length > 0 && lines[0].startsWith('#')) {
    actualTitle = lines[0].replace(/^#+\s*/, '').trim();
    inspirationContent = lines.slice(1).join('\n').trim();
  }
  
  // 提取标签（如果有）
  for (const line of lines) {
    if (line.includes('标签:') || line.includes('tags:')) {
      const tagLine = line.replace(/标签:|tags:/gi, '').trim();
      const extractedTags = tagLine.split(/[,，]/).map(t => t.trim()).filter(t => t);
      tags.push(...extractedTags);
    }
  }
  
  return {
    id: generateId(),
    title: actualTitle,
    content: inspirationContent,
    createdAt: Date.now(),
    tags: tags,
  };
};

const loadFromLocalStorage = () => {
  const saved = localStorage.getItem("writer-data");
  if (saved) {
    const data = JSON.parse(saved);
    appState.works = data.works || [];
  } else {
    createDefaultWork();
  }
};

const createDefaultWork = () => {
  appState.works = [
    {
      id: generateId(),
      title: "我的灵感是一方世界",
      description: "一个充满想象力的故事",
      genre: "玄幻",
      volumes: [
        {
          id: generateId(),
          title: "第一卷 武陵篇",
          chapterIds: [],
          order: 0,
        },
      ],
      chapters: [
        {
          id: generateId(),
          title: "第一章 真向外求",
          content: "若问道来无余说，天地都在一掌中。\n\n若问道来无余说，天地都在一掌中。\n吾善养吾浩然之气。\n\n世之奇伟瑰怪非常之观常在于险远而人之所罕至焉，故非遭心坚不能至也。",
          wordCount: 68,
          chapterOutline: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: generateId(),
          title: "第二章 章纲",
          content: "第二章内容...",
          wordCount: 0,
          chapterOutline: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      characters: [
        {
          id: generateId(),
          name: "主角",
          role: "protagonist",
          avatar: "",
          description: "故事的主角",
          personality: "坚毅、勇敢",
          background: "来自神秘的东方",
          other: "拥有特殊能力",
          color: "#c45c3e",
          updatedAt: Date.now(),
        },
        {
          id: generateId(),
          name: "反派",
          role: "antagonist",
          avatar: "",
          description: "主要反派角色",
          personality: "邪恶、狡诈",
          background: "黑暗势力的领袖",
          other: "拥有强大力量",
          color: "#d9534f",
          updatedAt: Date.now(),
        },
      ],
      outline: [],
      inspirations: [
        {
          id: generateId(),
          title: "故事灵感",
          content: "从中国传统文化中汲取灵感，创造一个独特的玄幻世界",
          createdAt: Date.now(),
          tags: ["玄幻", "东方"],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  saveData();
};

const saveData = () => {
  localStorage.setItem(
    "writer-data",
    JSON.stringify({
      works: appState.works,
      dailyCount: appState.dailyCount,
      dailyTarget: appState.dailyTarget,
      savePath: appState.savePath,
    })
  );
  
  // 同时保存到文件系统
  syncToFileSystem();
};

const syncToFileSystem = async () => {
  if (!appState.savePath) return;
  
  try {
    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    
    // 同步每一部作品
    for (const work of appState.works) {
      const workFolder = await join(appState.savePath, sanitizeFileName(work.title));
      
      // 创建作品文件夹
      await mkdir(workFolder, { recursive: true });
      
      // 保存简介
      const descPath = await join(workFolder, '简介.md');
      await writeTextFile(descPath, work.description || '');
      
      // 保存角色
      const charsFolder = await join(workFolder, '角色');
      await mkdir(charsFolder, { recursive: true });
      for (const char of work.characters) {
        const charPath = await join(charsFolder, `${sanitizeFileName(char.name)}.md`);
        const charContent = `# ${char.name}\n\n角色类型: ${getRoleName(char.role)}\n\n性格:\n${char.personality}\n\n背景:\n${char.background}\n\n其他:\n${char.other}\n\n描述:\n${char.description}`;
        await writeTextFile(charPath, charContent);
      }
      
      // 保存大纲
      const outlineFolder = await join(workFolder, '大纲');
      await mkdir(outlineFolder, { recursive: true });
      for (const outline of work.outline) {
        const outlinePath = await join(outlineFolder, `${sanitizeFileName(outline.title)}.md`);
        const outlineContent = `# ${outline.title}\n\n${outline.content}`;
        await writeTextFile(outlinePath, outlineContent);
      }
      
      // 保存灵感
      const inspirationFolder = await join(workFolder, '灵感');
      await mkdir(inspirationFolder, { recursive: true });
      for (const insp of work.inspirations) {
        const inspPath = await join(inspirationFolder, `${sanitizeFileName(insp.title)}.md`);
        const inspContent = `# ${insp.title}\n\n${insp.content}`;
        await writeTextFile(inspPath, inspContent);
      }
      
      // 保存设定文件夹
      const settingFolder = await join(workFolder, '设定');
      await mkdir(settingFolder, { recursive: true });
      
      // 保存卷和章节
      for (const volume of work.volumes) {
        const volFolder = await join(workFolder, sanitizeFileName(volume.title));
        await mkdir(volFolder, { recursive: true });
        
        for (const chapId of volume.chapterIds) {
          const chapter = work.chapters.find(c => c.id === chapId);
          if (chapter) {
            const chapPath = await join(volFolder, `${sanitizeFileName(chapter.title)}.md`);
            await writeTextFile(chapPath, `# ${chapter.title}\n\n${chapter.content}`);
          }
        }
      }
    }
    
    console.log('数据已同步到文件系统');
  } catch (error) {
    console.error('同步到文件系统失败:', error);
  }
};

// ==================== 4. 作品管理逻辑 ====================

/**
 * 创建新作品
 * 创建包含默认卷和章节的新作品
 */
const createNewWork = () => {
  const chapterId = generateId();
  const volumeId = generateId();
  
  const newChapter: Chapter = {
    id: chapterId,
    title: "第1章",
    content: "",
    wordCount: 0,
    chapterOutline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const newVolume: Volume = {
    id: volumeId,
    title: "第一卷",
    chapterIds: [chapterId],
    order: 0,
  };
  
  const newWork: Work = {
    id: generateId(),
    title: "新作品",
    description: "",
    genre: "",
    volumes: [newVolume],
    chapters: [newChapter],
    characters: [],
    outline: [],
    inspirations: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  appState.works.unshift(newWork);
  saveData();
};

const deleteWork = (workId: string) => {
  appState.works = appState.works.filter((w) => w.id !== workId);
  saveData();
};

const openWork = (workId: string) => {
  const work = appState.works.find((w) => w.id === workId);
  if (!work) return;
  
  // 如果没有章节，自动创建一个
  let chapterId = work.chapters[0]?.id;
  if (!chapterId) {
    const newChapter: Chapter = {
      id: generateId(),
      title: "第1章",
      content: "",
      wordCount: 0,
      chapterOutline: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    work.chapters.push(newChapter);
    chapterId = newChapter.id;
    
    // 如果没有卷，创建一个默认卷
    if (work.volumes.length === 0) {
      const newVolume: Volume = {
        id: generateId(),
        title: "第一卷",
        chapterIds: [chapterId],
        order: 0,
      };
      work.volumes.push(newVolume);
    } else {
      // 添加到第一个卷
      work.volumes[0].chapterIds.push(chapterId);
    }
    
    saveData();
  }
  
  const newTab: Tab = {
    id: generateId(),
    workId: workId,
    chapterId: chapterId,
    title: work.title || "未命名",
    viewType: "editor",
  };
  
  appState.tabs.push(newTab);
  appState.currentTabId = newTab.id;
  appState.currentWorkId = workId;
  appState.currentChapterId = chapterId;
  appState.view = "editor";
};

// ==================== 6. UI交互逻辑 ====================

/**
 * 打开指定类型的视图标签页
 * 用于大纲、角色、简介、灵感等视图的标签页管理
 */
const openViewTab = (workId: string, viewType: TabViewType) => {
  const work = appState.works.find((w) => w.id === workId);
  if (!work) return;
  
  const viewNames: Record<TabViewType, string> = {
    editor: work.title || "未命名",
    outline: "大纲",
    character: "角色",
    description: "简介",
    inspiration: "灵感",
  };
  
  // 检查是否已存在相同类型的标签页
  const existingTab = appState.tabs.find(
    (t) => t.workId === workId && t.viewType === viewType
  );
  
  if (existingTab) {
    appState.currentTabId = existingTab.id;
    return;
  }
  
  const newTab: Tab = {
    id: generateId(),
    workId: workId,
    chapterId: null,
    title: viewNames[viewType],
    viewType: viewType,
  };
  
  appState.tabs.push(newTab);
  appState.currentTabId = newTab.id;
  appState.currentWorkId = workId;
  appState.view = "editor";
};

const getCurrentTabViewType = (): TabViewType => {
  if (!appState.currentTabId) return "editor";
  const currentTab = appState.tabs.find((t) => t.id === appState.currentTabId);
  return currentTab?.viewType || "editor";
};

const isViewWindow = computed(() => {
  const hash = window.location.hash.slice(1);
  return hash.startsWith("/view?");
});

const closeTab = (tabId: string) => {
  const tab = appState.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  
  if (tab.workId === "home") {
    return;
  }
  
  const tabIndex = appState.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) return;
  
  appState.tabs.splice(tabIndex, 1);
  
  if (appState.currentTabId === tabId) {
    if (appState.tabs.length > 0) {
      const newIndex = Math.min(tabIndex, appState.tabs.length - 1);
      const newTab = appState.tabs[newIndex];
      appState.currentTabId = newTab.id;
      if (newTab.workId === "home") {
        appState.currentWorkId = null;
        appState.currentChapterId = null;
        appState.view = "home";
      } else {
        appState.currentWorkId = newTab.workId;
        appState.currentChapterId = newTab.chapterId;
      }
    } else {
      appState.currentTabId = null;
      appState.currentWorkId = null;
      appState.currentChapterId = null;
      appState.view = "home";
    }
  }
};

// ==================== 5. 章节和卷管理逻辑 ====================

/**
 * 创建新卷
 * 在当前作品中创建新卷，并同步到本地文件系统
 */
const createNewVolume = async () => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  
  const newVolume: Volume = {
    id: generateId(),
    title: `新卷`,
    description: '',
    chapterIds: [],
    order: work.volumes.length,
  };
  work.volumes.push(newVolume);
  saveData();
  
  // 创建本地文件夹和卷信息文件
  if (appState.savePath) {
    try {
      const { join, mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
      
      const volFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(newVolume.title));
      await mkdir(volFolder, { recursive: true });
      
      // 创建卷信息文件
      const volInfoPath = await join(volFolder, `${sanitizeFileName(newVolume.title)}.md`);
      const volInfoContent = `# ${newVolume.title}\n\n${newVolume.description}`;
      await writeTextFile(volInfoPath, volInfoContent);
      
      console.log(`卷 "${newVolume.title}" 已创建`);
    } catch (error) {
      console.error('创建卷文件夹失败:', error);
    }
  }
};

const deleteVolume = async (volumeId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const volume = work.volumes.find((v) => v.id === volumeId);
  if (volume) {
    // 删除本地文件夹和章节文件
    if (appState.savePath) {
      try {
        const { join } = await import('@tauri-apps/api/path');
        const { remove, exists } = await import('@tauri-apps/plugin-fs');
        
        const volFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(volume.title));
        if (await exists(volFolder)) {
          await remove(volFolder, { recursive: true });
          console.log(`已删除卷文件夹: ${volFolder}`);
        }
      } catch (error) {
        console.error('删除卷文件夹失败:', error);
      }
    }
    
    volume.chapterIds.forEach((chapterId) => {
      work.chapters = work.chapters.filter((c) => c.id !== chapterId);
    });
    work.volumes = work.volumes.filter((v) => v.id !== volumeId);
    
    // 重新排序卷的 order 和标题
    const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', 
      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
    work.volumes.sort((a, b) => a.order - b.order).forEach((v, index) => {
      v.order = index;
      const chineseNum = index + 1 <= 20 ? chineseNumbers[index] : (index + 1).toString();
      v.title = `第${chineseNum}卷`;
    });
    
    saveData();
  }
};

const deleteChapter = async (chapterId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const chapter = work.chapters.find((c) => c.id === chapterId);
  if (chapter) {
    // 删除本地章节文件
    if (appState.savePath) {
      try {
        const { join } = await import('@tauri-apps/api/path');
        const { remove, exists } = await import('@tauri-apps/plugin-fs');
        
        // 找到章节所属的卷
        const volume = work.volumes.find(v => v.chapterIds.includes(chapterId));
        if (volume) {
          const chapPath = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(volume.title), `${sanitizeFileName(chapter.title)}.md`);
          if (await exists(chapPath)) {
            await remove(chapPath);
            console.log(`已删除章节文件: ${chapPath}`);
          }
        } else {
          // 没有卷的章节，删除根目录下的文件
          const chapPath = await join(appState.savePath, sanitizeFileName(work.title), `${sanitizeFileName(chapter.title)}.md`);
          if (await exists(chapPath)) {
            await remove(chapPath);
            console.log(`已删除章节文件: ${chapPath}`);
          }
        }
      } catch (error) {
        console.error('删除章节文件失败:', error);
      }
    }
    
    // 从卷中移除章节ID
    work.volumes.forEach(v => {
      v.chapterIds = v.chapterIds.filter(id => id !== chapterId);
    });
    
    work.chapters = work.chapters.filter((c) => c.id !== chapterId);
    saveData();
  }
};

const updateVolumeTitle = (volumeId: string, title: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const volume = work.volumes.find((v) => v.id === volumeId);
  if (volume) {
    volume.title = title;
    saveData();
  }
};

// 更新卷的标题和简介
const updateVolume = async (volumeId: string, title: string, description: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const volume = work.volumes.find((v) => v.id === volumeId);
  if (volume) {
    const oldTitle = volume.title;
    volume.title = title;
    volume.description = description;
    saveData();
    
    // 同步到本地
    if (appState.savePath) {
      try {
        const { join, mkdir, writeTextFile, rename, exists, remove } = await import('@tauri-apps/plugin-fs');
        
        const volFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(oldTitle));
        const newVolFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(title));
        
        // 重命名文件夹
        if (oldTitle !== title && await exists(volFolder)) {
          await rename(volFolder, newVolFolder);
        }
        
        // 确保文件夹存在
        if (!await exists(newVolFolder)) {
          await mkdir(newVolFolder, { recursive: true });
        }
        
        // 保存卷信息到"卷名.md"文件
        const volInfoPath = await join(newVolFolder, `${sanitizeFileName(title)}.md`);
        const volInfoContent = `# ${title}\n\n${description}`;
        await writeTextFile(volInfoPath, volInfoContent);
        
        // 删除旧的简介.md文件（如果存在）
        const oldDescPath = await join(newVolFolder, '简介.md');
        if (await exists(oldDescPath)) {
          await remove(oldDescPath);
        }
        
        console.log(`卷 "${title}" 已更新`);
      } catch (error) {
        console.error('更新卷失败:', error);
      }
    }
  }
};

// 重新排序卷
const reorderVolumes = async (volumeIds: string[]) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  
  // 更新order
  volumeIds.forEach((id, index) => {
    const volume = work.volumes.find(v => v.id === id);
    if (volume) {
      volume.order = index;
    }
  });
  
  saveData();
  
  // 同步本地文件夹名称（按新顺序重命名）
  if (appState.savePath) {
    try {
      const { join, rename, exists } = await import('@tauri-apps/plugin-fs');
      
      // 暂时重命名为临时名称，避免冲突
      for (const v of work.volumes) {
        const oldFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(v.title));
        const tempFolder = await join(appState.savePath, sanitizeFileName(work.title), `temp_${v.id}`);
        if (await exists(oldFolder)) {
          await rename(oldFolder, tempFolder);
        }
      }
      
      // 重命名为最终名称
      for (const v of work.volumes) {
        const tempFolder = await join(appState.savePath, sanitizeFileName(work.title), `temp_${v.id}`);
        const newFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(v.title));
        if (await exists(tempFolder)) {
          await rename(tempFolder, newFolder);
        }
      }
      
      console.log('卷顺序已更新');
    } catch (error) {
      console.error('更新卷顺序失败:', error);
    }
  }
};

// 重新排序章节
const reorderChapters = async (volumeId: string, chapterIds: string[]) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  
  const volume = work.volumes.find(v => v.id === volumeId);
  if (!volume) return;
  
  // 更新chapterIds
  volume.chapterIds = chapterIds;
  
  // 更新章节标题（保持原有标题，不自动改名）
  saveData();
  
  // 同步本地文件（根据章节名匹配并覆盖）
  if (appState.savePath) {
    try {
      const { join, writeTextFile, readTextFile, remove, exists } = await import('@tauri-apps/plugin-fs');
      
      const volFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(volume.title));
      await mkdir(volFolder, { recursive: true });
      
      // 读取所有章节文件内容
      const chapterContents: Map<string, string> = new Map();
      for (const chapId of chapterIds) {
        const chapter = work.chapters.find(c => c.id === chapId);
        if (chapter) {
          // 尝试找到现有文件
          const existingFiles = await readDir(volFolder);
          for (const entry of existingFiles) {
            if (entry.isFile && entry.name?.endsWith('.md') && 
                entry.name !== '简介.md' && 
                entry.name !== `${sanitizeFileName(volume.title)}.md`) {
              const filePath = await join(volFolder, entry.name);
              const content = await readTextFile(filePath);
              const lines = content.split('\n');
              const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
              if (titleMatch && titleMatch[1].trim() === chapter.title) {
                chapterContents.set(chapId, content);
                break;
              }
            }
          }
          
          // 如果没找到，使用当前内容
          if (!chapterContents.has(chapId)) {
            chapterContents.set(chapId, `# ${chapter.title}\n\n${chapter.content}`);
          }
        }
      }
      
      // 删除所有旧文件（除了简介.md和卷信息文件）
      const oldFiles = await readDir(volFolder);
      for (const entry of oldFiles) {
        if (entry.isFile && entry.name?.endsWith('.md') && 
            entry.name !== '简介.md' && 
            entry.name !== `${sanitizeFileName(volume.title)}.md`) {
          const filePath = await join(volFolder, entry.name);
          await remove(filePath);
        }
      }
      
      // 按新顺序写入文件（根据章节名匹配）
      for (const chapId of chapterIds) {
        const chapter = work.chapters.find(c => c.id === chapId);
        if (chapter) {
          const filePath = await join(volFolder, `${sanitizeFileName(chapter.title)}.md`);
          await writeTextFile(filePath, chapterContents.get(chapId) || `# ${chapter.title}\n\n${chapter.content}`);
        }
      }
      
      console.log('章节顺序已更新');
    } catch (error) {
      console.error('更新章节顺序失败:', error);
    }
  }
};

// 移动卷位置（已弃用，使用拖拽代替）
const moveVolume = async (volumeId: string, direction: 'up' | 'down') => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  
  const sortedVolumes = [...work.volumes].sort((a, b) => a.order - b.order);
  const currentIndex = sortedVolumes.findIndex(v => v.id === volumeId);
  
  if (currentIndex === -1) return;
  
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= sortedVolumes.length) return;
  
  // 交换order
  const currentVolume = sortedVolumes[currentIndex];
  const targetVolume = sortedVolumes[newIndex];
  const tempOrder = currentVolume.order;
  currentVolume.order = targetVolume.order;
  targetVolume.order = tempOrder;
  
  saveData();
  
  // 同步本地文件夹名称
  if (appState.savePath) {
    try {
      const { join } = await import('@tauri-apps/api/path');
      const { rename, exists } = await import('@tauri-apps/plugin-fs');
      
      for (const v of work.volumes) {
        const oldFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(sortedVolumes.find(sv => sv.id === v.id && sv.title !== v.title)?.title || v.title));
        const newFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(v.title));
        if (await exists(oldFolder) && oldFolder !== newFolder) {
          await rename(oldFolder, newFolder);
          console.log(`重命名卷文件夹: ${oldFolder} -> ${newFolder}`);
        }
      }
    } catch (error) {
      console.error('重命名卷文件夹失败:', error);
    }
  }
};

// 移动章节位置
const moveChapter = async (chapterId: string, direction: 'up' | 'down') => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  
  // 找到章节所属的卷
  const volume = work.volumes.find(v => v.chapterIds.includes(chapterId));
  if (!volume) return;
  
  const currentIndex = volume.chapterIds.indexOf(chapterId);
  if (currentIndex === -1) return;
  
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= volume.chapterIds.length) return;
  
  // 交换位置
  const tempId = volume.chapterIds[currentIndex];
  volume.chapterIds[currentIndex] = volume.chapterIds[newIndex];
  volume.chapterIds[newIndex] = tempId;
  
  saveData();
  
  // 同步本地文件名称
  if (appState.savePath) {
    try {
      const { join } = await import('@tauri-apps/api/path');
      const { rename, exists, writeTextFile, remove } = await import('@tauri-apps/plugin-fs');
      
      const volFolder = await join(appState.savePath, sanitizeFileName(work.title), sanitizeFileName(volume.title));
      
      // 重命名所有章节文件
      for (const chapId of volume.chapterIds) {
        const chapter = work.chapters.find(c => c.id === chapId);
        if (chapter) {
          // 找到旧文件名（可能需要遍历文件夹）
          const oldFiles = await import('@tauri-apps/plugin-fs').then(fs => fs.readDir(volFolder));
          for (const entry of oldFiles) {
            if (entry.isFile && entry.name?.endsWith('.md')) {
              const oldPath = await join(volFolder, entry.name);
              const content = await import('@tauri-apps/plugin-fs').then(fs => fs.readTextFile(oldPath));
              // 检查内容中的章节ID或标题是否匹配
              const lines = content.split('\n');
              const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
              if (titleMatch && titleMatch[1].trim() === chapter.title) {
                // 这是正确的文件，不需要重命名
                continue;
              }
            }
          }
          
          // 直接写入新文件名
          const newPath = await join(volFolder, `${sanitizeFileName(chapter.title)}.md`);
          await writeTextFile(newPath, `# ${chapter.title}\n\n${chapter.content}`);
        }
      }
      
      // 清理旧文件（删除不在当前章节列表中的文件）
      const currentFiles = await import('@tauri-apps/plugin-fs').then(fs => fs.readDir(volFolder));
      for (const entry of currentFiles) {
        if (entry.isFile && entry.name?.endsWith('.md')) {
          const fileName = entry.name.replace('.md', '');
          const isCurrentChapter = volume.chapterIds.some(chapId => {
            const chapter = work.chapters.find(c => c.id === chapId);
            return chapter && sanitizeFileName(chapter.title) === fileName;
          });
          
          if (!isCurrentChapter) {
            const oldPath = await join(volFolder, entry.name);
            await remove(oldPath);
            console.log(`删除旧章节文件: ${oldPath}`);
          }
        }
      }
      
      console.log(`章节位置已更新`);
    } catch (error) {
      console.error('更新章节文件失败:', error);
    }
  }
};

const switchTab = (tabId: string) => {
  const tab = appState.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  
  appState.currentTabId = tabId;
  appState.currentWorkId = tab.workId;
  appState.currentChapterId = tab.chapterId;
  // 切换到编辑器视图
  appState.view = "editor";
};

const createNewChapter = () => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  
  // 计算章节总数
  const totalChapters = work.chapters.length;
  const num = totalChapters + 1;
  
  const newChapter: Chapter = {
    id: generateId(),
    title: `第${num}章`,
    content: "",
    wordCount: 0,
    chapterOutline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  work.chapters.push(newChapter);
  
  if (work.volumes.length > 0) {
    work.volumes[0].chapterIds.push(newChapter.id);
  }
  
  appState.currentChapterId = newChapter.id;
  saveData();
};

const addCharacter = () => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const colors = ["#c45c3e", "#4facfe", "#43e97b", "#f093fb", "#fa709a"];
  const newCharacter: Character = {
    id: generateId(),
    name: "",
    role: "other",
    avatar: "",
    description: "",
    personality: "",
    background: "",
    other: "",
    color: colors[work.characters.length % colors.length],
    updatedAt: Date.now(),
  };
  work.characters.push(newCharacter);
  saveData();
};

const deleteCharacter = async (charId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const char = work.characters.find((c) => c.id === charId);
  if (char) {
    // 删除本地角色文件
    if (appState.savePath) {
      try {
        const { join } = await import('@tauri-apps/api/path');
        const { remove, exists } = await import('@tauri-apps/plugin-fs');
        
        const charPath = await join(appState.savePath, sanitizeFileName(work.title), '角色', `${sanitizeFileName(char.name)}.md`);
        if (await exists(charPath)) {
          await remove(charPath);
          console.log(`已删除角色文件: ${charPath}`);
        }
      } catch (error) {
        console.error('删除角色文件失败:', error);
      }
    }
    
    work.characters = work.characters.filter((c) => c.id !== charId);
    saveData();
  }
};

const addInspiration = () => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const newInspiration: Inspiration = {
    id: generateId(),
    title: "",
    content: "",
    createdAt: Date.now(),
    tags: [],
  };
  work.inspirations.unshift(newInspiration);
  saveData();
};

const deleteInspiration = async (inspId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const insp = work.inspirations.find((i) => i.id === inspId);
  if (insp) {
    // 删除本地灵感文件
    if (appState.savePath) {
      try {
        const { join } = await import('@tauri-apps/api/path');
        const { remove, exists } = await import('@tauri-apps/plugin-fs');
        
        const inspPath = await join(appState.savePath, sanitizeFileName(work.title), '灵感', `${sanitizeFileName(insp.title)}.md`);
        if (await exists(inspPath)) {
          await remove(inspPath);
          console.log(`已删除灵感文件: ${inspPath}`);
        }
      } catch (error) {
        console.error('删除灵感文件失败:', error);
      }
    }
    
    work.inspirations = work.inspirations.filter((i) => i.id !== inspId);
    saveData();
  }
};

const openLocalSaveModal = () => {
  appState.showLocalSaveModal = true;
};

const closeLocalSaveModal = () => {
  appState.showLocalSaveModal = false;
};

const handleSyncNow = async () => {
  if (appState.currentWorkId) {
    const work = appState.works.find(w => w.id === appState.currentWorkId);
    if (work) {
      await saveWorkToLocal(work);
      console.log('作品已同步到本地');
    }
  }
};

const selectSavePath = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const result = await open({
      directory: true,
      multiple: false,
    });
    
    if (result && typeof result === 'string') {
      appState.savePath = result;
      saveData();
    }
  } catch (error) {
    console.error('选择保存路径失败:', error);
  }
};

const saveWorkToLocal = async (work: Work) => {
  if (!appState.savePath) {
    console.error('请先设置保存路径');
    return;
  }
  
  try {
    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    
    // 创建书籍文件夹
    const workFolder = await join(appState.savePath, sanitizeFileName(work.title || '未命名作品'));
    await mkdir(workFolder, { recursive: true });
    
    // 保存简介
    const descPath = await join(workFolder, '简介.md');
    await writeTextFile(descPath, work.description || '');
    
    // 保存角色
    const charsFolder = await join(workFolder, '角色');
    await mkdir(charsFolder, { recursive: true });
    for (const char of work.characters) {
      const charPath = await join(charsFolder, `${char.name}.md`);
      const charContent = `# ${char.name}\n\n角色类型: ${getRoleName(char.role)}\n\n性格:\n${char.personality}\n\n背景:\n${char.background}\n\n其他:\n${char.other}\n\n描述:\n${char.description}`;
      await writeTextFile(charPath, charContent);
    }
    
    // 保存大纲
    const outlineFolder = await join(workFolder, '大纲');
    await mkdir(outlineFolder, { recursive: true });
    for (const outline of work.outline) {
      const outlinePath = await join(outlineFolder, `${outline.title}.md`);
      await writeTextFile(outlinePath, `# ${outline.title}\n\n${outline.content}`);
    }
    
    // 保存灵感
    const inspirationFolder = await join(workFolder, '灵感');
    await mkdir(inspirationFolder, { recursive: true });
    for (const insp of work.inspirations) {
      const inspPath = await join(inspirationFolder, `${insp.title}.md`);
      await writeTextFile(inspPath, `# ${insp.title}\n\n${insp.content}`);
    }
    
    // 保存设定
    const settingFolder = await join(workFolder, '设定');
    await mkdir(settingFolder, { recursive: true });
    
    // 保存卷和章节
    for (const volume of work.volumes) {
      const volFolder = await join(workFolder, sanitizeFileName(volume.title));
      await mkdir(volFolder, { recursive: true });
      
      for (const chapId of volume.chapterIds) {
        const chapter = work.chapters.find(c => c.id === chapId);
        if (chapter) {
          const chapPath = await join(volFolder, `${sanitizeFileName(chapter.title)}.md`);
          await writeTextFile(chapPath, `# ${chapter.title}\n\n${chapter.content}`);
        }
      }
    }
    
    console.log(`作品 "${work.title}" 已保存到: ${workFolder}`);
  } catch (error) {
    console.error('保存作品失败:', error);
  }
};

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[\\/:*?"<>|]/g, '_');
};

const getRoleName = (role: string): string => {
  const roleMap: Record<string, string> = {
    protagonist: '主角',
    supporting: '配角',
    antagonist: '反派',
    other: '其他'
  };
  return roleMap[role] || role;
};

// 修改追踪系统
const modifiedItems = reactive<{
  chapters: Set<string>;
  characters: Set<string>;
  outlines: Set<string>;
  inspirations: Set<string>;
  description: Set<string>;
}>({
  chapters: new Set(),
  characters: new Set(),
  outlines: new Set(),
  inspirations: new Set(),
  description: new Set(),
});

// 标记章节为已修改
const markChapterModified = (chapterId: string) => {
  modifiedItems.chapters.add(chapterId);
};

// 标记角色为已修改
const markCharacterModified = (charId: string) => {
  modifiedItems.characters.add(charId);
};

// 标记大纲为已修改
const markOutlineModified = (outlineId: string) => {
  modifiedItems.outlines.add(outlineId);
};

// 标记灵感为已修改
const markInspirationModified = (inspId: string) => {
  modifiedItems.inspirations.add(inspId);
};

// 标记简介为已修改
const markDescriptionModified = (workId: string) => {
  modifiedItems.description.add(workId);
};

// 保存状态
const saveStatus = reactive<{
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: string | null;
  retryCount: number;
}>({
  status: 'idle',
  error: null,
  retryCount: 0,
});

const goHome = () => {
  // 移除可能存在的首页标签（防止重复）
  appState.tabs = appState.tabs.filter((t) => t.workId !== "home");
  // 直接切换到首页视图，不创建新标签
  appState.view = "home";
  appState.currentTabId = null;
  appState.currentWorkId = null;
  appState.currentChapterId = null;
};

const loadChapter = (chapterId: string) => {
  appState.currentChapterId = chapterId;
};

// 自动保存变量和定时器
let autoSaveTimer: number | null = null;

// ==================== 7. 自动保存和增量保存逻辑 ====================

/**
 * 防抖自动保存
 * 2秒后自动保存，避免频繁保存
 */
const autoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // 标记当前章节为已修改
  if (appState.currentChapterId) {
    markChapterModified(appState.currentChapterId);
  }
  
  autoSaveTimer = window.setTimeout(() => {
    console.log('触发自动保存...');
    saveStatus.status = 'saving';
    
    // 保存到 localStorage
    saveData();
    
    // 增量同步到文件系统
    if (appState.currentWorkId) {
      const work = appState.works.find(w => w.id === appState.currentWorkId);
      if (work) {
        saveWorkIncremental(work).then(() => {
          saveStatus.status = 'saved';
          saveStatus.retryCount = 0;
          console.log('作品已自动保存到本地');
        }).catch((error) => {
          saveStatus.status = 'error';
          saveStatus.error = error.message || '保存失败';
          console.error('自动保存失败:', error);
        });
      }
    }
  }, 2000);
};

// 立即保存（不含防抖）
const saveImmediately = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  saveData();
  if (appState.currentWorkId) {
    const work = appState.works.find(w => w.id === appState.currentWorkId);
    if (work) {
      saveWorkIncremental(work);
    }
  }
};

// 增量保存作品（只保存修改的内容）
const saveWorkIncremental = async (work: Work, maxRetries = 3) => {
  if (!appState.savePath) {
    console.error('请先设置保存路径');
    return;
  }
  
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const { mkdir, writeTextFile, readDir, readTextFile, remove } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      
      // 创建书籍文件夹
      const workFolder = await join(appState.savePath, sanitizeFileName(work.title || '未命名作品'));
      await mkdir(workFolder, { recursive: true });
      
      // 保存简介（如果有修改）
      if (modifiedItems.description.has(work.id)) {
        const descPath = await join(workFolder, '简介.md');
        await writeTextFile(descPath, work.description || '');
        modifiedItems.description.delete(work.id);
      }
      
      // 保存角色（只保存修改的角色）
      const charsFolder = await join(workFolder, '角色');
      await mkdir(charsFolder, { recursive: true });
      for (const charId of modifiedItems.characters) {
        const char = work.characters.find(c => c.id === charId);
        if (char) {
          const charPath = await join(charsFolder, `${sanitizeFileName(char.name)}.md`);
          const charContent = `# ${char.name}\n\n角色类型: ${getRoleName(char.role)}\n\n性格:\n${char.personality}\n\n背景:\n${char.background}\n\n其他:\n${char.other}\n\n描述:\n${char.description}`;
          await writeTextFile(charPath, charContent);
        }
        modifiedItems.characters.delete(charId);
      }
      
      // 保存大纲（只保存修改的大纲）
      const outlineFolder = await join(workFolder, '大纲');
      await mkdir(outlineFolder, { recursive: true });
      for (const outlineId of modifiedItems.outlines) {
        const outline = work.outline.find(o => o.id === outlineId);
        if (outline) {
          const outlinePath = await join(outlineFolder, `${sanitizeFileName(outline.title)}.md`);
          await writeTextFile(outlinePath, `# ${outline.title}\n\n${outline.content}`);
        }
        modifiedItems.outlines.delete(outlineId);
      }
      
      // 保存灵感（只保存修改的灵感）
      const inspirationFolder = await join(workFolder, '灵感');
      await mkdir(inspirationFolder, { recursive: true });
      for (const inspId of modifiedItems.inspirations) {
        const insp = work.inspirations.find(i => i.id === inspId);
        if (insp) {
          const inspPath = await join(inspirationFolder, `${sanitizeFileName(insp.title)}.md`);
          await writeTextFile(inspPath, `# ${insp.title}\n\n${insp.content}`);
        }
        modifiedItems.inspirations.delete(inspId);
      }
      
      // 保存设定
      const settingFolder = await join(workFolder, '设定');
      await mkdir(settingFolder, { recursive: true });
      
      // 保存章节（根据章节名匹配并覆盖文件）
      for (const chapterId of modifiedItems.chapters) {
        const chapter = work.chapters.find(c => c.id === chapterId);
        if (chapter) {
          // 找到章节所属的卷
          const volume = work.volumes.find(v => v.chapterIds.includes(chapterId));
          const folder = volume 
            ? await join(workFolder, sanitizeFileName(volume.title))
            : workFolder;
          
          await mkdir(folder, { recursive: true });
          
          // 查找是否有匹配章节名的文件
          const existingFiles = await readDir(folder);
          let matchedFile: string | null = null;
          
          for (const entry of existingFiles) {
            if (entry.isFile && entry.name?.endsWith('.md') && 
                entry.name !== '简介.md' && 
                entry.name !== `${sanitizeFileName(volume?.title || '')}.md`) {
              const filePath = await join(folder, entry.name);
              const content = await readTextFile(filePath);
              const lines = content.split('\n');
              const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
              
              // 如果文件内容标题匹配当前章节标题，则匹配成功
              if (titleMatch && titleMatch[1].trim() === chapter.title) {
                matchedFile = filePath;
                break;
              }
            }
          }
          
          // 如果找到匹配的文件，覆盖该文件
          if (matchedFile) {
            await writeTextFile(matchedFile, `# ${chapter.title}\n\n${chapter.content}`);
            console.log(`覆盖章节文件: ${chapter.title}`);
          } else {
            // 如果没找到匹配的文件，新建文件
            const chapPath = await join(folder, `${sanitizeFileName(chapter.title)}.md`);
            await writeTextFile(chapPath, `# ${chapter.title}\n\n${chapter.content}`);
            console.log(`新建章节文件: ${chapter.title}`);
          }
        }
        modifiedItems.chapters.delete(chapterId);
      }
      
      console.log(`作品 "${work.title}" 已增量保存到: ${workFolder}`);
      return;
    } catch (error: any) {
      retryCount++;
      console.error(`保存失败（第${retryCount}次尝试）:`, error);
      
      if (retryCount < maxRetries) {
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw new Error(`保存失败，已重试${maxRetries}次: ${error.message}`);
      }
    }
  }
};

provide("appState", appState);
provide("saveData", saveData);
provide("autoSave", autoSave);
provide("saveImmediately", saveImmediately);
provide("createNewWork", createNewWork);
provide("deleteWork", deleteWork);
provide("openWork", openWork);
provide("openViewTab", openViewTab);
provide("createNewChapter", createNewChapter);
provide("deleteChapter", deleteChapter);
provide("createNewVolume", createNewVolume);
provide("deleteVolume", deleteVolume);
provide("updateVolumeTitle", updateVolumeTitle);
provide("updateVolume", updateVolume);
provide("reorderVolumes", reorderVolumes);
provide("reorderChapters", reorderChapters);
provide("moveVolume", moveVolume);
provide("moveChapter", moveChapter);
provide("addCharacter", addCharacter);
provide("deleteCharacter", deleteCharacter);
provide("addInspiration", addInspiration);
provide("deleteInspiration", deleteInspiration);
provide("goHome", goHome);
provide("loadChapter", loadChapter);
provide("closeTab", closeTab);
provide("switchTab", switchTab);
provide("saveWorkToLocal", saveWorkToLocal);
provide("saveWorkIncremental", saveWorkIncremental);
provide("markChapterModified", markChapterModified);
provide("markCharacterModified", markCharacterModified);
provide("markOutlineModified", markOutlineModified);
provide("markInspirationModified", markInspirationModified);
provide("markDescriptionModified", markDescriptionModified);
provide("saveStatus", saveStatus);
provide("openLocalSaveModal", openLocalSaveModal);

// 快捷键支持
const registerShortcuts = () => {
  const handleKeydown = async (event: KeyboardEvent) => {
    // Ctrl/Cmd + S - 手动同步到本地
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveImmediately();
      console.log('作品已手动同步到本地');
    }
    
    // Ctrl/Cmd + Shift + S - 设置本地保存路径
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 's') {
      event.preventDefault();
      openLocalSaveModal();
    }
  };
  
  window.addEventListener('keydown', handleKeydown);
};

loadData();
registerShortcuts();
</script>

<template>
  <div class="app-container">
    <div class="tabs-bar">
      <div
        class="tab-item home-tab"
        :class="{ active: appState.view === 'home' }"
        @click="goHome()"
      >
        <span class="tab-title">首页</span>
        <span class="tab-close-disabled">●</span>
      </div>
      <div
        v-for="tab in appState.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: appState.currentTabId === tab.id }"
        @click="switchTab(tab.id)"
      >
        <span class="tab-title">{{ tab.title }}</span>
        <button class="tab-close" @click.stop="closeTab(tab.id)">
          ×
        </button>
      </div>
      <button class="settings-btn" @click="openLocalSaveModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>
    
    <div class="main-content">
      <!-- 检查是否是新窗口视图模式 -->
      <ViewWindow v-if="isViewWindow" />
      <template v-else>
        <HomeView v-if="appState.view === 'home'" />
        <template v-else>
          <EditorView v-if="!appState.currentTabId || getCurrentTabViewType() === 'editor'" />
          <OutlineModal
            v-else-if="getCurrentTabViewType() === 'outline'"
            :visible="true"
            :work="appState.works.find(w => w.id === appState.currentWorkId)"
          />
          <CharacterModal
            v-else-if="getCurrentTabViewType() === 'character'"
            :visible="true"
            :work="appState.works.find(w => w.id === appState.currentWorkId)"
          />
          <DescriptionModal
            v-else-if="getCurrentTabViewType() === 'description'"
            :visible="true"
            :work="appState.works.find(w => w.id === appState.currentWorkId)"
          />
          <InspirationModal
            v-else-if="getCurrentTabViewType() === 'inspiration'"
            :visible="true"
            :work="appState.works.find(w => w.id === appState.currentWorkId)"
          />
        </template>
      </template>
    </div>
    
    <SettingModal
      :visible="appState.showSettingModal"
      @update:visible="appState.showSettingModal = $event"
      :work-id="appState.currentWorkId || ''"
    />
    
    <div v-if="appState.showLocalSaveModal" class="modal-overlay" @click="closeLocalSaveModal">
      <div class="local-save-modal" @click.stop>
        <div class="modal-header">
          <h3>本地保存设置</h3>
          <button class="modal-close" @click="closeLocalSaveModal">×</button>
        </div>
        <div class="modal-body">
          <div class="save-path-section">
            <label>保存路径:</label>
            <div class="path-input-group">
              <input 
                type="text" 
                :value="appState.savePath" 
                disabled 
                class="path-input"
                placeholder="请选择保存路径"
              />
              <button class="browse-btn" @click="selectSavePath">浏览...</button>
            </div>
          </div>
          <div class="save-info">
            <p>保存结构:</p>
            <pre>
书籍文件夹/
├── 简介.md
├── 角色/
│   └── 角色名.md
├── 大纲/
│   └── 大纲项.md
├── 灵感/
│   └── 灵感项.md
├── 设定/
│   └── 设定项.md
└── 第一卷/
    └── 第1章.md
            </pre>
          </div>
          <div class="shortcuts-info">
            <p>快捷键:</p>
            <ul>
              <li><kbd>Ctrl/Cmd + S</kbd> - 手动同步当前作品到本地</li>
              <li><kbd>Ctrl/Cmd + Shift + S</kbd> - 打开本地保存设置</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeLocalSaveModal">取消</button>
          <button 
            class="btn-sync" 
            @click="handleSyncNow"
            :disabled="!appState.savePath || !appState.currentWorkId"
          >
            立即同步
          </button>
          <button class="btn-confirm" @click="closeLocalSaveModal">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #faf8f5;
  color: #333;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.tabs-bar {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background: #f8f4eb;
  border-bottom: 1px solid #e8e4dc;
  min-height: 36px;
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
  transition: all 0.2s;
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
  font-size: 14px;
  color: #999;
  line-height: 1;
}

.tab-close:hover {
  background: #ffe4e4;
  color: #c45c3e;
}

.tab-close-disabled {
  width: 12px;
  height: 12px;
  color: #ccc;
  font-size: 8px;
}

.settings-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:hover {
  background: #f5f0e8;
  color: #c45c3e;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.local-save-modal {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.modal-close {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  color: #999;
  line-height: 1;
}

.modal-close:hover {
  color: #c45c3e;
}

.modal-body {
  padding: 20px;
}

.save-path-section {
  margin-bottom: 20px;
}

.save-path-section label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.path-input-group {
  display: flex;
  gap: 10px;
}

.path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: #f9f9f9;
  color: #666;
}

.browse-btn {
  padding: 8px 16px;
  border: 1px solid #c45c3e;
  background: #c45c3e;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.browse-btn:hover {
  background: #a34a30;
  border-color: #a34a30;
}

.save-info {
  background: #f8f4eb;
  padding: 16px;
  border-radius: 4px;
}

.save-info p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.save-info pre {
  margin: 0;
  font-size: 12px;
  color: #666;
  font-family: monospace;
  white-space: pre-wrap;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  padding: 8px 20px;
  border: 1px solid #c45c3e;
  background: #c45c3e;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-confirm:hover {
  background: #a34a30;
  border-color: #a34a30;
}

.btn-sync {
  padding: 8px 20px;
  border: 1px solid #4CAF50;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-sync:hover:not(:disabled) {
  background: #45a049;
  border-color: #45a049;
}

.btn-sync:disabled {
  background: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.shortcuts-info {
  margin-top: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 4px;
}

.shortcuts-info p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.shortcuts-info ul {
  margin: 0;
  padding-left: 20px;
}

.shortcuts-info li {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.shortcuts-info li:last-child {
  margin-bottom: 0;
}

.shortcuts-info kbd {
  display: inline-block;
  padding: 2px 6px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}
</style>
