<script setup lang="ts">
import { inject, ref, computed } from "vue";
import { Plus, Document, More, Close, Search, Star, Delete, Edit } from "@element-plus/icons-vue";
import type { Work, AppState, KnowledgeItem, KnowledgeCategory, KnowledgeGenre } from "../types";

const appState = inject<AppState>("appState")!;
const createNewWork =
  inject<(title: string, description?: string) => void>("createNewWork")!;
const isWorkTitleExists =
  inject<(title: string) => boolean>("isWorkTitleExists")!;
const openWork = inject<(id: string) => void>("openWork")!;
const addKnowledgeItem = inject<(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) => void>("addKnowledgeItem")!;
const updateKnowledgeItem = inject<(id: string, updates: Partial<KnowledgeItem>) => void>("updateKnowledgeItem")!;
const deleteKnowledgeItem = inject<(id: string) => void>("deleteKnowledgeItem")!;
const toggleKnowledgeFavorite = inject<(id: string) => void>("toggleKnowledgeFavorite")!;

// ==================== 侧边栏切换 ====================
const switchSubView = (view: 'works' | 'knowledge') => {
  appState.homeSubView = view;
};

// ==================== 作品相关逻辑（原有） ====================
const bookCovers = [
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=fantasy%20novel%20book%20cover%20with%20magical%20elements%20and%20heroic%20character%20chinese%20style&image_size=portrait_4_3",
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=urban%20story%20book%20cover%20with%20modern%20city%20background%20chinese%20style&image_size=portrait_4_3",
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=historical%20novel%20book%20cover%20with%20ancient%20chinese%20palace&image_size=portrait_4_3",
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=sci-fi%20book%20cover%20with%20space%20and%20futuristic%20elements%20chinese%20style&image_size=portrait_4_3",
];

const getBookCover = (index: number): string => {
  return bookCovers[index % bookCovers.length];
};

const getTotalWords = (work: Work): number => {
  return work.chapters.reduce(
    (sum: number, ch: { wordCount: number }) => sum + ch.wordCount,
    0,
  );
};

const formatWordCount = (count: number): string => {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + "万字";
  }
  return count + "字";
};

const expandedMenu = ref<string | null>(null);

const toggleMenu = (workId: string) => {
  expandedMenu.value = expandedMenu.value === workId ? null : workId;
};

const showCreateModal = ref(false);
const newBookTitle = ref("");
const newBookDescription = ref("");
const titleError = ref("");
const showConfirmModal = ref(false);

const openCreateModal = () => {
  showCreateModal.value = true;
  newBookTitle.value = "";
  newBookDescription.value = "";
  titleError.value = "";
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newBookTitle.value = "";
  newBookDescription.value = "";
  titleError.value = "";
  showConfirmModal.value = false;
};

const checkTitleAndConfirm = () => {
  const title = newBookTitle.value.trim();

  if (!title) {
    titleError.value = "请输入书名";
    return;
  }

  if (title.length > 50) {
    titleError.value = "书名不能超过50个字符";
    return;
  }

  if (isWorkTitleExists(title)) {
    titleError.value = "书名已存在，请输入其他名称";
    return;
  }

  titleError.value = "";
  showConfirmModal.value = true;
};

const confirmCreateBook = () => {
  try {
    createNewWork(newBookTitle.value.trim(), newBookDescription.value.trim());
    closeCreateModal();
  } catch (error) {
    titleError.value = (error as Error).message;
    showConfirmModal.value = false;
  }
};

// ==================== 知识库相关逻辑 ====================

// 分类配置
const categoryConfig: Record<KnowledgeCategory, { label: string; icon: string; color: string }> = {
  character: { label: '角色', icon: '👤', color: '#e8826b' },
  plot: { label: '情节', icon: '📖', color: '#6b8ae8' },
  quote: { label: '名句', icon: '💬', color: '#e8b66b' },
  cheat: { label: '金手指', icon: '⚡', color: '#9b6be8' },
};

// 题材配置
const genreConfig: Record<KnowledgeGenre, { label: string; color: string }> = {
  fantasy: { label: '玄幻', color: '#8b5cf6' },
  urban: { label: '都市', color: '#3b82f6' },
  comedy: { label: '搞笑', color: '#f59e0b' },
  romance: { label: '恋爱', color: '#ec4899' },
};

// 知识库筛选状态
const knowledgeSearchQuery = ref('');
const selectedCategory = ref<KnowledgeCategory | 'all'>('all');
const selectedGenre = ref<KnowledgeGenre | 'all'>('all');
const selectedFavoriteOnly = ref(false);

// 知识库编辑弹窗
const showKnowledgeModal = ref(false);
const editingKnowledgeId = ref<string | null>(null);
const knowledgeForm = ref({
  title: '',
  content: '',
  category: 'character' as KnowledgeCategory,
  genres: [] as KnowledgeGenre[],
  tags: [] as string[],
});
const knowledgeTagInput = ref('');

// 知识库详情查看
const viewingKnowledge = ref<KnowledgeItem | null>(null);

// 过滤后的知识库条目
const filteredKnowledgeItems = computed(() => {
  let items = appState.knowledgeItems;

  if (selectedCategory.value !== 'all') {
    items = items.filter(i => i.category === selectedCategory.value);
  }

  if (selectedGenre.value !== 'all') {
    items = items.filter(i => i.genres.includes(selectedGenre.value as KnowledgeGenre));
  }

  if (selectedFavoriteOnly.value) {
    items = items.filter(i => i.favorite);
  }

  if (knowledgeSearchQuery.value.trim()) {
    const query = knowledgeSearchQuery.value.trim().toLowerCase();
    items = items.filter(i =>
      i.title.toLowerCase().includes(query) ||
      i.content.toLowerCase().includes(query) ||
      i.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
});

// 统计各分类数量
const getCategoryCount = (category: KnowledgeCategory | 'all') => {
  if (category === 'all') return appState.knowledgeItems.length;
  return appState.knowledgeItems.filter(i => i.category === category).length;
};

// 统计各题材数量
const getGenreCount = (genre: KnowledgeGenre | 'all') => {
  if (genre === 'all') return appState.knowledgeItems.length;
  return appState.knowledgeItems.filter(i => i.genres.includes(genre)).length;
};

// 打开新建知识条目
const openCreateKnowledge = () => {
  editingKnowledgeId.value = null;
  knowledgeForm.value = {
    title: '',
    content: '',
    category: selectedCategory.value === 'all' ? 'character' : selectedCategory.value,
    genres: selectedGenre.value === 'all' ? [] : [selectedGenre.value as KnowledgeGenre],
    tags: [],
  };
  knowledgeTagInput.value = '';
  showKnowledgeModal.value = true;
};

// 打开编辑知识条目
const openEditKnowledge = (item: KnowledgeItem) => {
  editingKnowledgeId.value = item.id;
  knowledgeForm.value = {
    title: item.title,
    content: item.content,
    category: item.category,
    genres: [...item.genres],
    tags: [...item.tags],
  };
  knowledgeTagInput.value = '';
  showKnowledgeModal.value = true;
  viewingKnowledge.value = null;
};

// 切换题材选择（多选）
const toggleGenre = (genre: KnowledgeGenre) => {
  const idx = knowledgeForm.value.genres.indexOf(genre);
  if (idx === -1) {
    knowledgeForm.value.genres.push(genre);
  } else {
    knowledgeForm.value.genres.splice(idx, 1);
  }
};

// 添加标签
const addTag = () => {
  const tag = knowledgeTagInput.value.trim();
  if (tag && !knowledgeForm.value.tags.includes(tag)) {
    knowledgeForm.value.tags.push(tag);
    knowledgeTagInput.value = '';
  }
};

// 移除标签
const removeTag = (index: number) => {
  knowledgeForm.value.tags.splice(index, 1);
};

// 保存知识条目
const saveKnowledge = () => {
  if (!knowledgeForm.value.title.trim()) return;

  if (editingKnowledgeId.value) {
    updateKnowledgeItem(editingKnowledgeId.value, {
      title: knowledgeForm.value.title.trim(),
      content: knowledgeForm.value.content.trim(),
      category: knowledgeForm.value.category,
      genres: [...knowledgeForm.value.genres],
      tags: knowledgeForm.value.tags,
    });
  } else {
    addKnowledgeItem({
      title: knowledgeForm.value.title.trim(),
      content: knowledgeForm.value.content.trim(),
      category: knowledgeForm.value.category,
      genres: [...knowledgeForm.value.genres],
      tags: knowledgeForm.value.tags,
      favorite: false,
    });
  }

  showKnowledgeModal.value = false;
};

// 删除知识条目
const handleDeleteKnowledge = (item: KnowledgeItem) => {
  deleteKnowledgeItem(item.id);
  viewingKnowledge.value = null;
};

// 收藏切换
const handleToggleFavorite = (item: KnowledgeItem) => {
  toggleKnowledgeFavorite(item.id);
};

// 查看知识条目详情
const openKnowledgeDetail = (item: KnowledgeItem) => {
  viewingKnowledge.value = item;
};

// 关闭详情
const closeKnowledgeDetail = () => {
  viewingKnowledge.value = null;
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
};

// 获取分类配置
const getCategoryInfo = (cat: KnowledgeCategory) => categoryConfig[cat];
const getGenreInfo = (genre: KnowledgeGenre) => genreConfig[genre];
</script>

<template>
  <div class="home-container">
    <div class="main-layout">
      <!-- 左侧主导航 -->
      <aside data-tauri-drag-region class="sidebar">
        <nav class="sidebar-nav">
          <button
            class="nav-item"
            :class="{ active: appState.homeSubView === 'works' }"
            @click="switchSubView('works')"
          >
            <Document class="nav-icon" />
            <span>小说作品</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: appState.homeSubView === 'knowledge' }"
            @click="switchSubView('knowledge')"
          >
            <Document class="nav-icon" />
            <span>知识库</span>
          </button>
        </nav>
      </aside>

      <!-- ================ 小说作品视图 ================ -->
      <main v-if="appState.homeSubView === 'works'" class="main-content">
        <header data-tauri-drag-region class="main-header">
          <div class="banner-section"></div>

          <div class="action-bar">
            <button class="action-btn primary" @click="openCreateModal">
              <Plus class="action-icon" />
              <span>新建</span>
              <span class="action-hint">作品</span>
            </button>
            <button class="action-btn">
              <span>导入</span>
              <span class="action-hint">本地导入私密作品</span>
            </button>
          </div>
        </header>

        <section class="works-section">
          <div class="section-header">
            <div class="section-title">
              <span>全部作品</span>
              <span class="dropdown-arrow">▼</span>
            </div>
          </div>

          <div v-if="appState.works.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <h2>还没有作品</h2>
            <p>点击上方按钮开始创作你的第一个故事</p>
          </div>

          <div v-else class="works-grid">
            <div
              v-for="(work, index) in appState.works"
              :key="work.id"
              class="work-card"
            >
              <div class="work-cover" @click="openWork(work.id)">
                <img :src="getBookCover(index)" :alt="work.title" />
                <div class="work-tags">
                  <span v-if="work.chapters.length > 0" class="tag serial-tag"
                    >连载中</span
                  >
                </div>
              </div>
              <div class="work-info" @click="openWork(work.id)">
                <h3 class="work-title">{{ work.title || "未命名" }}</h3>
                <p class="work-words">
                  {{ formatWordCount(getTotalWords(work)) }}
                </p>
              </div>
              <button class="work-more-btn" @click.stop="toggleMenu(work.id)">
                <More class="more-icon" />
              </button>

              <div v-if="expandedMenu === work.id" class="work-menu">
                <div class="menu-item"><span>私密作品设置</span></div>
                <div class="menu-item"><span>书封管理</span></div>
                <div class="menu-item">
                  <span>发布平台设置</span><span class="menu-arrow">></span>
                </div>
                <div class="menu-item">
                  <span>移入分组</span><span class="menu-arrow">></span>
                </div>
                <div class="menu-item"><span>取消置顶</span></div>
                <div class="menu-item"><span>从桌面隐藏</span></div>
                <div class="menu-item danger"><span>移入回收站</span></div>
              </div>
            </div>

            <div class="work-card add-card" @click="openCreateModal">
              <div class="add-icon">+</div>
              <span class="add-text">新建作品</span>
            </div>
          </div>
        </section>
      </main>

      <!-- ================ 知识库视图 ================ -->
      <main v-else class="knowledge-main">
        <!-- 知识库子侧边栏 -->
        <aside class="knowledge-sub-sidebar">
          <div class="knowledge-sub-header">
            <span class="knowledge-sub-title">分类</span>
          </div>
          <div class="knowledge-sub-nav">
            <button
              class="knowledge-sub-item"
              :class="{ active: selectedCategory === 'all' }"
              @click="selectedCategory = 'all'"
            >
              <span class="sub-icon">📚</span>
              <span class="sub-label">全部</span>
              <span class="sub-count">{{ getCategoryCount('all') }}</span>
            </button>
            <button
              v-for="(config, key) in categoryConfig"
              :key="key"
              class="knowledge-sub-item"
              :class="{ active: selectedCategory === key }"
              @click="selectedCategory = key as KnowledgeCategory"
            >
              <span class="sub-icon">{{ config.icon }}</span>
              <span class="sub-label">{{ config.label }}</span>
              <span class="sub-count">{{ getCategoryCount(key as KnowledgeCategory) }}</span>
            </button>
          </div>

          <div class="knowledge-sub-divider"></div>

          <div class="knowledge-sub-header">
            <span class="knowledge-sub-title">题材</span>
          </div>
          <div class="knowledge-sub-nav">
            <button
              class="knowledge-sub-item"
              :class="{ active: selectedGenre === 'all' }"
              @click="selectedGenre = 'all'"
            >
              <span class="sub-icon">🏷️</span>
              <span class="sub-label">全部</span>
              <span class="sub-count">{{ getGenreCount('all') }}</span>
            </button>
            <button
              v-for="(config, key) in genreConfig"
              :key="key"
              class="knowledge-sub-item"
              :class="{ active: selectedGenre === key }"
              @click="selectedGenre = key as KnowledgeGenre"
            >
              <span class="genre-dot" :style="{ background: config.color }"></span>
              <span class="sub-label">{{ config.label }}</span>
              <span class="sub-count">{{ getGenreCount(key as KnowledgeGenre) }}</span>
            </button>
          </div>

          <div class="knowledge-sub-divider"></div>

          <button
            class="knowledge-sub-item favorite-item"
            :class="{ active: selectedFavoriteOnly }"
            @click="selectedFavoriteOnly = !selectedFavoriteOnly"
          >
            <span class="sub-icon">⭐</span>
            <span class="sub-label">收藏</span>
          </button>
        </aside>

        <!-- 知识库主内容 -->
        <div class="knowledge-content">
          <header class="knowledge-header">
            <div class="knowledge-search-bar">
              <Search class="search-icon" />
              <input
                v-model="knowledgeSearchQuery"
                type="text"
                placeholder="搜索知识库..."
                class="knowledge-search-input"
              />
            </div>
            <button class="action-btn primary" @click="openCreateKnowledge">
              <Plus class="action-icon" />
              <span>添加</span>
            </button>
          </header>

          <section class="knowledge-section">
            <div class="section-header">
              <div class="section-title">
                <span>全部知识</span>
                <span class="knowledge-total">{{ filteredKnowledgeItems.length }}条</span>
              </div>
            </div>

            <div v-if="filteredKnowledgeItems.length === 0" class="empty-state">
              <div class="empty-icon">📖</div>
              <h2>暂无知识内容</h2>
              <p>点击上方按钮添加你的第一条知识</p>
            </div>

            <div v-else class="knowledge-grid">
              <div
                v-for="item in filteredKnowledgeItems"
                :key="item.id"
                class="knowledge-card"
                @click="openKnowledgeDetail(item)"
              >
                <div class="card-header">
                  <span class="card-category" :style="{ background: getCategoryInfo(item.category).color }">
                    {{ getCategoryInfo(item.category).icon }} {{ getCategoryInfo(item.category).label }}
                  </span>
                  <button
                    class="card-favorite-btn"
                    :class="{ active: item.favorite }"
                    @click.stop="handleToggleFavorite(item)"
                  >
                    <Star class="favorite-icon" />
                  </button>
                </div>
                <h3 class="card-title">{{ item.title }}</h3>
                <p class="card-content">{{ item.content }}</p>
                <div class="card-footer">
                  <div class="card-genres">
                    <span
                      v-for="g in item.genres"
                      :key="g"
                      class="card-genre"
                      :style="{ color: getGenreInfo(g).color }"
                    >
                      {{ getGenreInfo(g).label }}
                    </span>
                  </div>
                  <div class="card-tags">
                    <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="card-tag">{{ tag }}</span>
                  </div>
                  <span class="card-time">{{ formatTime(item.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <!-- ================ 新建作品弹窗 ================ -->
      <div
        v-if="showCreateModal"
        class="modal-overlay"
        @click.self="closeCreateModal"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h2>新建作品</h2>
            <button class="modal-close" @click="closeCreateModal">
              <Close class="close-icon" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="book-title"
                >书名 <span class="required">*</span></label
              >
              <input
                id="book-title"
                v-model="newBookTitle"
                type="text"
                placeholder="请输入书名"
                class="form-input"
                :class="{ error: titleError }"
                maxlength="50"
              />
              <p v-if="titleError" class="error-message">{{ titleError }}</p>
            </div>

            <div class="form-group">
              <label for="book-description">简介</label>
              <textarea
                id="book-description"
                v-model="newBookDescription"
                placeholder="请输入作品简介（可选）"
                class="form-textarea"
                rows="4"
                maxlength="500"
              ></textarea>
              <p class="char-count">{{ newBookDescription.length }}/500</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-cancel" @click="closeCreateModal">
              取消
            </button>
            <button class="btn btn-primary" @click="checkTitleAndConfirm">
              下一步
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showConfirmModal"
        class="modal-overlay"
        @click.self="showConfirmModal = false"
      >
        <div class="modal-content confirm-modal">
          <div class="confirm-icon">📝</div>
          <h2>确认创建</h2>
          <p>您确定要创建名为《{{ newBookTitle.trim() }}》的作品吗？</p>

          <div v-if="newBookDescription.trim()" class="preview-section">
            <h3>作品简介：</h3>
            <p>{{ newBookDescription.trim() }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn btn-cancel" @click="showConfirmModal = false">
              返回修改
            </button>
            <button class="btn btn-primary" @click="confirmCreateBook">
              确认创建
            </button>
          </div>
        </div>
      </div>

      <!-- ================ 知识库编辑弹窗 ================ -->
      <div
        v-if="showKnowledgeModal"
        class="modal-overlay"
        @click.self="showKnowledgeModal = false"
      >
        <div class="modal-content knowledge-modal">
          <div class="modal-header">
            <h2>{{ editingKnowledgeId ? '编辑知识' : '添加知识' }}</h2>
            <button class="modal-close" @click="showKnowledgeModal = false">
              <Close class="close-icon" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>标题 <span class="required">*</span></label>
              <input
                v-model="knowledgeForm.title"
                type="text"
                placeholder="请输入标题"
                class="form-input"
                maxlength="100"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>分类</label>
                <select v-model="knowledgeForm.category" class="form-select">
                  <option v-for="(config, key) in categoryConfig" :key="key" :value="key">
                    {{ config.icon }} {{ config.label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>题材（可多选）</label>
                <div class="genre-multi-select">
                  <button
                    v-for="(config, key) in genreConfig"
                    :key="key"
                    type="button"
                    class="genre-option"
                    :class="{ active: knowledgeForm.genres.includes(key as KnowledgeGenre) }"
                    :style="knowledgeForm.genres.includes(key as KnowledgeGenre) ? { background: config.color, borderColor: config.color } : {}"
                    @click="toggleGenre(key as KnowledgeGenre)"
                  >
                    <span class="genre-dot" :style="{ background: knowledgeForm.genres.includes(key as KnowledgeGenre) ? '#fff' : config.color }"></span>
                    {{ config.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>内容</label>
              <textarea
                v-model="knowledgeForm.content"
                placeholder="请输入内容..."
                class="form-textarea knowledge-textarea"
                rows="6"
              ></textarea>
            </div>

            <div class="form-group">
              <label>标签</label>
              <div class="tag-input-area">
                <div class="tag-list">
                  <span v-for="(tag, i) in knowledgeForm.tags" :key="i" class="tag-item">
                    {{ tag }}
                    <button class="tag-remove" @click="removeTag(i)">×</button>
                  </span>
                </div>
                <input
                  v-model="knowledgeTagInput"
                  type="text"
                  placeholder="输入标签后回车"
                  class="tag-input"
                  @keydown.enter.prevent="addTag"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-cancel" @click="showKnowledgeModal = false">取消</button>
            <button class="btn btn-primary" @click="saveKnowledge">保存</button>
          </div>
        </div>
      </div>

      <!-- ================ 知识库详情弹窗 ================ -->
      <div
        v-if="viewingKnowledge"
        class="modal-overlay"
        @click.self="closeKnowledgeDetail"
      >
        <div class="modal-content knowledge-detail-modal">
          <div class="modal-header">
            <div class="detail-header-left">
              <span class="card-category" :style="{ background: getCategoryInfo(viewingKnowledge.category).color }">
                {{ getCategoryInfo(viewingKnowledge.category).icon }} {{ getCategoryInfo(viewingKnowledge.category).label }}
              </span>
              <span
                v-for="g in viewingKnowledge.genres"
                :key="g"
                class="card-genre"
                :style="{ color: getGenreInfo(g).color }"
              >
                {{ getGenreInfo(g).label }}
              </span>
            </div>
            <div class="detail-header-right">
              <button class="detail-action-btn" @click="handleToggleFavorite(viewingKnowledge)" :class="{ active: viewingKnowledge.favorite }">
                <Star class="favorite-icon" />
              </button>
              <button class="detail-action-btn" @click="openEditKnowledge(viewingKnowledge)">
                <Edit class="detail-icon" />
              </button>
              <button class="detail-action-btn danger" @click="handleDeleteKnowledge(viewingKnowledge)">
                <Delete class="detail-icon" />
              </button>
              <button class="modal-close" @click="closeKnowledgeDetail">
                <Close class="close-icon" />
              </button>
            </div>
          </div>

          <div class="knowledge-detail-body">
            <h2 class="detail-title">{{ viewingKnowledge.title }}</h2>
            <div class="detail-meta">
              <span>更新于 {{ formatTime(viewingKnowledge.updatedAt) }}</span>
            </div>
            <div class="detail-content">{{ viewingKnowledge.content }}</div>
            <div v-if="viewingKnowledge.tags.length > 0" class="detail-tags">
              <span v-for="tag in viewingKnowledge.tags" :key="tag" class="card-tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  height: 95vh;
  background: #fdf8f3;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ================ 左侧主导航 ================ */
.sidebar {
  width: 180px;
  background: #f5f0e8;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  border-right: 1px solid #e8e4dc;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 12px 24px;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }

  &.active {
    background: rgba(196, 92, 62, 0.1);
    color: #c45c3e;
  }
}

.nav-icon {
  width: 18px;
  height: 18px;
}

/* ================ 主内容区（作品） ================ */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  padding: 24px;
  border-bottom: 1px solid #e8e4dc;
}

.banner-section {
  margin-bottom: 20px;
}

.action-bar {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e8e4dc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;

  &:hover {
    border-color: #d4cfc7;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.primary {
    background: #c45c3e;
    border-color: #c45c3e;
    color: white;

    &:hover {
      background: #b34d32;
      border-color: #b34d32;
    }
  }
}

.action-icon {
  width: 16px;
  height: 16px;
}

.action-hint {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
}

.works-section {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.dropdown-arrow {
  font-size: 12px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #999;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.work-card {
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.add-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    border: 2px dashed #e8e4dc;
    background: transparent;

    &:hover {
      border-color: #c45c3e;
      background: rgba(196, 92, 62, 0.02);
    }
  }
}

.work-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
}

.work-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.work-tags {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
}

.tag {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;

  &.serial-tag {
    background: #c45c3e;
    color: white;
  }
}

.work-info {
  padding: 12px;
}

.work-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-words {
  font-size: 12px;
  color: #999;
}

.work-more-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.work-card:hover .work-more-btn {
  opacity: 1;
}

.more-icon {
  width: 14px;
  height: 14px;
  color: white;
}

.work-menu {
  position: absolute;
  top: 36px;
  right: 8px;
  width: 160px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &.danger {
    color: #d32f2f;
  }
}

.menu-arrow {
  font-size: 12px;
  color: #999;
}

.add-icon {
  width: 40px;
  height: 40px;
  border: 2px dashed #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ccc;
  margin-bottom: 12px;
}

.add-text {
  font-size: 14px;
  color: #999;
}

/* ================ 知识库视图 ================ */
.knowledge-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.knowledge-sub-sidebar {
  width: 200px;
  background: #f5f0e8;
  border-right: 1px solid #e8e4dc;
  padding: 16px 0;
  overflow-y: auto;
}

.knowledge-sub-header {
  padding: 4px 20px 8px;
}

.knowledge-sub-title {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
}

.knowledge-sub-nav {
  display: flex;
  flex-direction: column;
}

.knowledge-sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: rgba(196, 92, 62, 0.1);
    color: #c45c3e;
  }
}

.sub-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.sub-label {
  flex: 1;
  text-align: left;
}

.sub-count {
  font-size: 11px;
  color: #aaa;
}

.genre-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.knowledge-sub-divider {
  height: 1px;
  background: #e8e4dc;
  margin: 12px 20px;
}

.favorite-item {
  margin-top: 4px;
}

.knowledge-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.knowledge-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e4dc;
}

.knowledge-search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e8e4dc;
  border-radius: 8px;
}

.search-icon {
  width: 16px;
  height: 16px;
  color: #999;
}

.knowledge-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: none;
}

.knowledge-section {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.knowledge-total {
  font-size: 14px;
  font-weight: 400;
  color: #999;
}

.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.knowledge-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-category {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
}

.card-favorite-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  transition: all 0.2s;

  &:hover, &.active {
    color: #f5a623;
  }
}

.favorite-icon {
  width: 14px;
  height: 14px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-genres {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-genre {
  font-size: 12px;
  font-weight: 500;
}

.genre-multi-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.genre-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: #fff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.genre-option:hover {
  border-color: #b0b0b0;
}

.genre-option.active {
  color: #fff;
}

.genre-option .genre-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
}

.card-tag {
  padding: 1px 6px;
  font-size: 11px;
  background: #f0ede8;
  border-radius: 3px;
  color: #888;
}

.card-time {
  font-size: 11px;
  color: #bbb;
  margin-left: auto;
}

/* ================ 弹窗通用样式 ================ */
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

.modal-content {
  width: 480px;
  background: white;
  border-radius: 12px;
  overflow: hidden;

  &.confirm-modal {
    padding: 32px;
    text-align: center;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e4dc;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }
}

.close-icon {
  width: 16px;
  height: 16px;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.required {
  color: #d32f2f;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;

  &.error {
    border-color: #d32f2f;
  }
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.error-message {
  font-size: 12px;
  color: #d32f2f;
  margin-top: 4px;
}

.char-count {
  font-size: 12px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e8e4dc;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-cancel {
    background: #f5f5f5;
    color: #666;

    &:hover {
      background: #e8e8e8;
    }
  }

  &.btn-primary {
    background: #c45c3e;
    color: white;

    &:hover {
      background: #b34d32;
    }
  }
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-modal h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.confirm-modal p {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.preview-section {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: left;
}

.preview-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.preview-section p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* ================ 知识库弹窗 ================ */
.knowledge-modal {
  width: 560px;
}

.knowledge-textarea {
  min-height: 120px;
}

.tag-input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f0ede8;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
}

.tag-remove {
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  font-size: 14px;
  padding: 0;
  line-height: 1;

  &:hover {
    color: #d32f2f;
  }
}

.tag-input {
  padding: 8px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

/* ================ 知识库详情弹窗 ================ */
.knowledge-detail-modal {
  width: 600px;
}

.detail-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }

  &.active {
    color: #f5a623;
  }

  &.danger:hover {
    color: #d32f2f;
  }
}

.detail-icon {
  width: 16px;
  height: 16px;
}

.knowledge-detail-body {
  padding: 24px;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.detail-meta {
  font-size: 12px;
  color: #999;
  margin-bottom: 20px;
}

.detail-content {
  font-size: 14px;
  color: #444;
  line-height: 1.8;
  white-space: pre-wrap;
  margin-bottom: 20px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 16px;
  border-top: 1px solid #e8e4dc;
}
</style>
