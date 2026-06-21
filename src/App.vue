<script setup lang="ts">
import { ref, provide, reactive } from "vue";
import HomeView from "./components/HomeView.vue";
import EditorView from "./components/EditorView.vue";
import OutlineModal from "./components/OutlineModal.vue";
import CharacterModal from "./components/CharacterModal.vue";
import InspirationModal from "./components/InspirationModal.vue";
import SettingModal from "./components/SettingModal.vue";

export interface ChapterOutline {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  chapterOutline: ChapterOutline[];
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  name: string;
  role: "protagonist" | "supporting" | "antagonist" | "other";
  avatar: string;
  description: string;
  personality: string;
  background: string;
  other: string;
  color: string;
  updatedAt: number;
}

export interface OutlineItem {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  order: number;
  expanded: boolean;
}

export interface Inspiration {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  tags: string[];
}

export interface Work {
  id: string;
  title: string;
  description: string;
  genre: string;
  chapters: Chapter[];
  characters: Character[];
  outline: OutlineItem[];
  inspirations: Inspiration[];
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  works: Work[];
  currentWorkId: string | null;
  currentChapterId: string | null;
  view: "home" | "editor";
  theme: "light" | "dark" | "eye";
  editorMode: "wysiwyg" | "ir" | "sv";
  dailyCount: number;
  dailyTarget: number;
  tabs: Tab[];
  currentTabId: string | null;
}

export interface Tab {
  id: string;
  workId: string;
  chapterId: string | null;
  title: string;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

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
});

const showOutlineModal = ref(false);
const showCharacterModal = ref(false);
const showInspirationModal = ref(false);
const showSettingModal = ref(false);

const loadData = () => {
  const saved = localStorage.getItem("writer-data");
  if (saved) {
    const data = JSON.parse(saved);
    appState.works = data.works || [];
    appState.dailyCount = data.dailyCount || 0;
    appState.dailyTarget = data.dailyTarget || 3000;
  } else {
    appState.works = [
      {
        id: generateId(),
        title: "我的灵感是一方世界",
        description: "一个充满想象力的故事",
        genre: "玄幻",
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
  }
};

const saveData = () => {
  localStorage.setItem(
    "writer-data",
    JSON.stringify({
      works: appState.works,
      dailyCount: appState.dailyCount,
      dailyTarget: appState.dailyTarget,
    })
  );
};

const createNewWork = () => {
  const newWork: Work = {
    id: generateId(),
    title: "新作品",
    description: "",
    genre: "",
    chapters: [],
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
  
  const newTab: Tab = {
    id: generateId(),
    workId: workId,
    chapterId: work.chapters[0]?.id || null,
    title: work.title || "未命名",
  };
  
  appState.tabs.push(newTab);
  appState.currentTabId = newTab.id;
  appState.currentWorkId = workId;
  appState.currentChapterId = newTab.chapterId;
  appState.view = "editor";
};

const closeTab = (tabId: string) => {
  const tabIndex = appState.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) return;
  
  appState.tabs.splice(tabIndex, 1);
  
  if (appState.currentTabId === tabId) {
    if (appState.tabs.length > 0) {
      const newIndex = Math.min(tabIndex, appState.tabs.length - 1);
      const newTab = appState.tabs[newIndex];
      appState.currentTabId = newTab.id;
      appState.currentWorkId = newTab.workId;
      appState.currentChapterId = newTab.chapterId;
    } else {
      appState.currentTabId = null;
      appState.currentWorkId = null;
      appState.currentChapterId = null;
      appState.view = "home";
    }
  }
};

const switchTab = (tabId: string) => {
  const tab = appState.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  
  appState.currentTabId = tabId;
  appState.currentWorkId = tab.workId;
  appState.currentChapterId = tab.chapterId;
};

const createNewChapter = () => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  const newChapter: Chapter = {
    id: generateId(),
    title: "",
    content: "",
    wordCount: 0,
    chapterOutline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  work.chapters.push(newChapter);
  appState.currentChapterId = newChapter.id;
  saveData();
};

const deleteChapter = (chapterId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  work.chapters = work.chapters.filter((c) => c.id !== chapterId);
  if (appState.currentChapterId === chapterId) {
    appState.currentChapterId = work.chapters[0]?.id || null;
  }
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

const deleteCharacter = (charId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  work.characters = work.characters.filter((c) => c.id !== charId);
  saveData();
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

const deleteInspiration = (inspId: string) => {
  const work = appState.works.find((w) => w.id === appState.currentWorkId);
  if (!work) return;
  work.inspirations = work.inspirations.filter((i) => i.id !== inspId);
  saveData();
};

const goHome = () => {
  appState.view = "home";
  appState.currentWorkId = null;
  appState.currentChapterId = null;
  appState.tabs = [];
  appState.currentTabId = null;
};

const loadChapter = (chapterId: string) => {
  appState.currentChapterId = chapterId;
};

provide("appState", appState);
provide("saveData", saveData);
provide("createNewWork", createNewWork);
provide("deleteWork", deleteWork);
provide("openWork", openWork);
provide("createNewChapter", createNewChapter);
provide("deleteChapter", deleteChapter);
provide("addCharacter", addCharacter);
provide("deleteCharacter", deleteCharacter);
provide("addInspiration", addInspiration);
provide("deleteInspiration", deleteInspiration);
provide("goHome", goHome);
provide("loadChapter", loadChapter);
provide("closeTab", closeTab);
provide("switchTab", switchTab);
provide("showOutlineModal", showOutlineModal);
provide("showCharacterModal", showCharacterModal);
provide("showInspirationModal", showInspirationModal);
provide("showSettingModal", showSettingModal);

loadData();
</script>

<template>
  <div class="app-container">
    <HomeView v-if="appState.view === 'home'" />
    <EditorView v-else />
    
    <OutlineModal
      v-model:visible="showOutlineModal"
      :work="appState.works.find(w => w.id === appState.currentWorkId)"
    />
    
    <CharacterModal
      v-model:visible="showCharacterModal"
      :work="appState.works.find(w => w.id === appState.currentWorkId)"
    />
    
    <InspirationModal
      v-model:visible="showInspirationModal"
      :work="appState.works.find(w => w.id === appState.currentWorkId)"
    />
    
    <SettingModal
      v-model:visible="showSettingModal"
      :work-id="appState.currentWorkId || ''"
    />
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
  min-height: 100vh;
}
</style>
