<script setup lang="ts">
import { inject, ref } from "vue";
import { Plus, Folder, Document, Bell, More, User, DataAnalysis } from "@element-plus/icons-vue";
import type { Work, AppState } from "../App.vue";

const appState = inject<AppState>("appState")!;
const createNewWork = inject<() => void>("createNewWork")!;
const openWork = inject<(id: string) => void>("openWork")!;

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
  return work.chapters.reduce((sum: number, ch: { wordCount: number }) => sum + ch.wordCount, 0);
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
</script>

<template>
  <div class="home-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="user-avatar">
          <img src="https://neeko-copilot.bytedance.net/api/text_to_image?prompt=avatar%20portrait%20of%20a%20writer%20chinese%20style&image_size=square" alt="用户头像" />
        </div>
        <span class="user-name">作家助手</span>
      </div>
      
      <nav class="sidebar-nav">
        <button class="nav-item active">
          <Document class="nav-icon" />
          <span>小说作品</span>
        </button>
        <button class="nav-item">
          <Folder class="nav-icon" />
          <span>短篇副本</span>
        </button>
        <button class="nav-item">
          <DataAnalysis class="nav-icon" />
          <span>码字统计</span>
        </button>
        <button class="nav-item">
          <User class="nav-icon" />
          <span>码字好友</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon-text">📚</span>
          <span>阅创学堂</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon-text">💬</span>
          <span>神助社区</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon-text">📋</span>
          <span>任务中心</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon-text">🛒</span>
          <span>墨水商店</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon-text">🎁</span>
          <span>邀请卡</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon-text">🎨</span>
          <span>装扮中心</span>
        </button>
        <button class="nav-item">
          <Bell class="nav-icon" />
          <span>消息通知</span>
        </button>
      </nav>
    </aside>
    
    <main class="main-content">
      <header class="main-header">
        <div class="banner-section">
          <div class="banner">
            <div class="banner-content">
              <h2>守护原创</h2>
              <h3>反对抄袭</h3>
              <p>"每一次署名支持，都是对原创生态的守护！"</p>
            </div>
          </div>
          
          <div class="task-card">
            <div class="task-header">
              <span class="task-title">做任务赚墨水 (10/20)</span>
              <span class="task-arrow">></span>
            </div>
            <div class="task-progress">
              <span>每日码字超过1000字得5墨水</span>
              <span class="task-remaining">桌面端专属，还差 1000 字</span>
            </div>
            <button class="task-button">去完成</button>
          </div>
        </div>
        
        <div class="action-bar">
          <button class="action-btn primary" @click="createNewWork">
            <Plus class="action-icon" />
            <span>新建</span>
            <span class="action-hint">私密作品、网文作品、分组</span>
          </button>
          <button class="action-btn">
            <span>导入</span>
            <span class="action-hint">本地导入私密作品</span>
          </button>
          <button class="action-btn">
            <span>投稿阅文</span>
            <span class="action-hint">编辑直投，投稿后仅编辑可见</span>
          </button>
          <button class="action-btn">
            <span>模板中心</span>
            <span class="action-hint">总裁、现言、开头应有尽有</span>
          </button>
        </div>
      </header>
      
      <section class="works-section">
        <div class="section-header">
          <div class="section-title">
            <span>全部作品</span>
            <span class="dropdown-arrow">▼</span>
          </div>
          <div class="section-actions">
            <span class="action-link">已隐藏</span>
            <span class="action-link">回收站</span>
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
                <span v-if="work.chapters.length > 0" class="tag serial-tag">连载中</span>
                <span v-if="work.genre" class="tag genre-tag">{{ work.genre }}</span>
              </div>
            </div>
            <div class="work-info" @click="openWork(work.id)">
              <h3 class="work-title">{{ work.title || "未命名" }}</h3>
              <p class="work-words">{{ formatWordCount(getTotalWords(work)) }}</p>
            </div>
            <button class="work-more-btn" @click.stop="toggleMenu(work.id)">
              <More class="more-icon" />
            </button>
            
            <div v-if="expandedMenu === work.id" class="work-menu">
              <div class="menu-item">
                <span>私密作品设置</span>
              </div>
              <div class="menu-item">
                <span>书封管理</span>
              </div>
              <div class="menu-item">
                <span>发布平台设置</span>
                <span class="menu-arrow">></span>
              </div>
              <div class="menu-item">
                <span>移入分组</span>
                <span class="menu-arrow">></span>
              </div>
              <div class="menu-item">
                <span>取消置顶</span>
              </div>
              <div class="menu-item">
                <span>从桌面隐藏</span>
              </div>
              <div class="menu-item danger">
                <span>移入回收站</span>
              </div>
            </div>
          </div>
          
          <div class="work-card add-card" @click="createNewWork">
            <div class="add-icon">+</div>
            <span class="add-text">新建作品</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  height: 100vh;
  background: #fdf8f3;
}

.sidebar {
  width: 180px;
  background: #f5f0e8;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  border-right: 1px solid #e8e4dc;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e4dc;
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 12px;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.sidebar-nav {
  margin-top: 20px;
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
}

.nav-item:hover {
  background: #eee;
}

.nav-item.active {
  background: #e8dfd3;
  color: #c45c3e;
  font-weight: 500;
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.main-header {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e8e4dc;
}

.banner-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.banner {
  flex: 2;
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  position: relative;
  overflow: hidden;
}

.banner::after {
  content: "";
  position: absolute;
  right: -50px;
  top: -50px;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.banner-content h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.banner-content h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.banner-content p {
  font-size: 12px;
  opacity: 0.9;
}

.task-card {
  flex: 1;
  background: #fff9f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.task-arrow {
  color: #999;
  font-size: 12px;
}

.task-progress {
  font-size: 12px;
  color: #666;
}

.task-remaining {
  color: #c45c3e;
  margin-left: 8px;
}

.task-button {
  align-self: flex-end;
  background: #4facfe;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.task-button:hover {
  background: #3d9cef;
}

.action-bar {
  display: flex;
  gap: 16px;
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
}

.action-btn:hover {
  border-color: #c45c3e;
}

.action-btn.primary {
  background: #c45c3e;
  border-color: #c45c3e;
  color: white;
}

.action-btn.primary:hover {
  background: #a84d33;
}

.action-icon {
  width: 16px;
  height: 16px;
}

.action-hint {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 4px;
}

.works-section {
  padding: 24px;
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
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dropdown-arrow {
  font-size: 10px;
  color: #999;
}

.section-actions {
  display: flex;
  gap: 20px;
}

.action-link {
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.action-link:hover {
  color: #c45c3e;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.work-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.work-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.work-cover {
  position: relative;
  height: 220px;
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
}

.tag {
  background: #ff6b6b;
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
}

.work-info {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.work-words {
  font-size: 12px;
  color: #999;
}

.work-more-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
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
}

.work-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f0e8;
}

.menu-item.danger {
  color: #c45c3e;
}

.menu-arrow {
  color: #999;
  font-size: 12px;
}

.serial-tag {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
}

.genre-tag {
  background: #4facfe;
  margin-left: 4px;
}

.add-card {
  height: 268px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e8e4dc;
  background: #faf8f5;
}

.add-icon {
  font-size: 32px;
  color: #c45c3e;
  margin-bottom: 8px;
}

.add-text {
  font-size: 13px;
  color: #999;
}
</style>
