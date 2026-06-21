/**
 * 作品服务模块
 * 提供作品的加载、保存、解析等功能
 */

import { join } from '@tauri-apps/api/path';
import { mkdir, readTextFile, readDir, exists } from '@tauri-apps/plugin-fs';
import type { Work, Volume, Chapter, Character, OutlineItem, Inspiration } from '../types';
import { generateId, sanitizeFileName, extractVolumeNumber, extractChapterNumber } from './utils';

/**
 * 作品服务类
 * 负责作品的加载、保存、解析等操作
 */
export class WorkService {
  private savePath: string;

  constructor(savePath: string) {
    this.savePath = savePath;
  }

  /**
   * 更新保存路径
   */
  updateSavePath(path: string): void {
    this.savePath = path;
  }

  /**
   * 从文件系统加载所有作品
   */
  async loadWorks(): Promise<Work[]> {
    try {
      if (!await exists(this.savePath)) {
        await mkdir(this.savePath, { recursive: true });
        return [];
      }

      const entries = await readDir(this.savePath);
      const works: Work[] = [];

      for (const entry of entries) {
        if (entry.isDirectory && entry.name) {
          const workFolder = await join(this.savePath, entry.name);
          const work = await this.loadWorkFromFolder(workFolder, entry.name);
          if (work) {
            works.push(work);
          }
        }
      }

      console.log(`已加载 ${works.length} 部作品`);
      return works;
    } catch (error) {
      console.error('从文件系统加载失败:', error);
      throw error;
    }
  }

  /**
   * 从文件夹加载单个作品
   */
  private async loadWorkFromFolder(folderPath: string, folderName: string): Promise<Work | null> {
    try {
      const work: Work = {
        id: generateId(),
        title: folderName,
        description: '',
        cover: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        volumes: [],
        chapters: [],
        characters: [],
        outline: [],
        inspirations: [],
        totalWordCount: 0
      };

      // 读取简介
      const descPath = await join(folderPath, '简介.md');
      if (await exists(descPath)) {
        work.description = await readTextFile(descPath);
      }

      // 读取角色
      const charactersPath = await join(folderPath, '角色');
      if (await exists(charactersPath)) {
        const charEntries = await readDir(charactersPath);
        for (const entry of charEntries) {
          if (entry.isFile && entry.name?.endsWith('.md')) {
            const charFilePath = await join(charactersPath, entry.name);
            const charContent = await readTextFile(charFilePath);
            const char = this.parseCharacterFromMarkdown(charContent, entry.name);
            work.characters.push(char);
          }
        }
      }

      // 读取大纲
      const outlinePath = await join(folderPath, '大纲');
      if (await exists(outlinePath)) {
        const outlineEntries = await readDir(outlinePath);
        for (const entry of outlineEntries) {
          if (entry.isFile && entry.name?.endsWith('.md')) {
            const outlineFilePath = await join(outlinePath, entry.name);
            const outlineContent = await readTextFile(outlineFilePath);
            const outline = this.parseOutlineFromMarkdown(outlineContent, entry.name);
            work.outline.push(outline);
          }
        }
      }

      // 读取灵感
      const inspirationPath = await join(folderPath, '灵感');
      if (await exists(inspirationPath)) {
        const inspirationEntries = await readDir(inspirationPath);
        for (const entry of inspirationEntries) {
          if (entry.isFile && entry.name?.endsWith('.md')) {
            const inspirationFilePath = await join(inspirationPath, entry.name);
            const inspirationContent = await readTextFile(inspirationFilePath);
            const inspiration = this.parseInspirationFromMarkdown(inspirationContent, entry.name);
            work.inspirations.push(inspiration);
          }
        }
      }

      // 读取卷和章节
      const entries = await readDir(folderPath);
      const volumeFolders: { name: string; path: string }[] = [];

      for (const entry of entries) {
        if (entry.isDirectory && entry.name && 
            entry.name !== '角色' && entry.name !== '大纲' && 
            entry.name !== '灵感' && entry.name !== '设定') {
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

        // 读取卷信息文件
        const volInfoPath = await join(volFolder.path, `${sanitizeFileName(volFolder.name)}.md`);
        if (await exists(volInfoPath)) {
          const volInfoContent = await readTextFile(volInfoPath);
          const lines = volInfoContent.split('\n');
          if (lines[0]?.startsWith('# ')) {
            volume.title = lines[0].substring(2).trim();
          }
          volume.description = lines.slice(2).join('\n').trim();
        }

        // 兼容旧的简介.md格式
        const volDescPath = await join(volFolder.path, '简介.md');
        if (await exists(volDescPath) && !await exists(volInfoPath)) {
          volume.description = await readTextFile(volDescPath);
        }

        // 读取章节
        const chapterEntries = await readDir(volFolder.path);
        const chapterFiles: { name: string; path: string }[] = [];

        for (const chapEntry of chapterEntries) {
          if (chapEntry.isFile && chapEntry.name?.endsWith('.md')) {
            if (chapEntry.name === `${sanitizeFileName(volFolder.name)}.md` || 
                chapEntry.name === '简介.md') {
              continue;
            }
            chapterFiles.push({
              name: chapEntry.name,
              path: await join(volFolder.path, chapEntry.name)
            });
          }
        }

        // 按章节序号排序
        chapterFiles.sort((a, b) => {
          const numA = extractChapterNumber(a.name);
          const numB = extractChapterNumber(b.name);
          return numA - numB;
        });

        for (const chapFile of chapterFiles) {
          const chapterContent = await readTextFile(chapFile.path);
          const chapter = this.parseChapterFromMarkdown(chapterContent, chapFile.name);
          work.chapters.push(chapter);
          volume.chapterIds.push(chapter.id);
        }

        work.volumes.push(volume);
      }

      // 计算总字数
      work.totalWordCount = work.chapters.reduce((sum, chap) => sum + chap.wordCount, 0);

      return work;
    } catch (error) {
      console.error('加载作品失败:', error);
      return null;
    }
  }

  /**
   * 解析章节 Markdown 内容
   */
  private parseChapterFromMarkdown(content: string, fileName: string): Chapter {
    let title = fileName.replace(/\.md$/, '');
    let chapterContent = content;

    const lines = content.split('\n');
    const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      chapterContent = lines.slice(1).join('\n').trim();
    }

    const wordCount = chapterContent.replace(/\s/g, '').length;

    return {
      id: generateId(),
      title,
      content: chapterContent,
      wordCount,
      chapterOutline: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * 解析角色 Markdown 内容
   */
  private parseCharacterFromMarkdown(content: string, fileName: string): Character {
    const name = fileName.replace(/\.md$/, '');
    const lines = content.split('\n');
    let role: 'protagonist' | 'supporting' | 'antagonist' | 'other' = 'other';
    let personality = '';
    let background = '';
    let other = '';
    let description = '';

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
        if (!description) description = line.trim();
      }
    }

    return {
      id: generateId(),
      name,
      role,
      avatar: '',
      description: description || content,
      personality,
      background,
      other,
      color: role === 'protagonist' ? '#c45c3e' : role === 'antagonist' ? '#d9534f' : '#666',
      updatedAt: Date.now(),
    };
  }

  /**
   * 解析大纲 Markdown 内容
   */
  private parseOutlineFromMarkdown(content: string, fileName: string): OutlineItem {
    const title = fileName.replace(/\.md$/, '');
    const lines = content.split('\n');
    let actualTitle = title;
    let outlineContent = content;

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
  }

  /**
   * 解析灵感 Markdown 内容
   */
  private parseInspirationFromMarkdown(content: string, fileName: string): Inspiration {
    const title = fileName.replace(/\.md$/, '');
    const lines = content.split('\n');
    let actualTitle = title;
    let inspirationContent = content;
    let type = '其他';
    let color = '#409EFF';

    if (lines.length > 0 && lines[0].startsWith('#')) {
      actualTitle = lines[0].replace(/^#+\s*/, '').trim();
      inspirationContent = lines.slice(1).join('\n').trim();
    }

    for (const line of lines) {
      if (line.startsWith('类型:') || line.startsWith('type:')) {
        type = line.replace(/类型:|type:/gi, '').trim();
      }
    }

    return {
      id: generateId(),
      title: actualTitle,
      content: inspirationContent,
      type,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * 创建默认作品
   */
  createDefaultWork(): Work {
    return {
      id: generateId(),
      title: "我的灵感是一方世界",
      description: "一个充满想象力的故事",
      cover: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      volumes: [
        {
          id: generateId(),
          title: "第一卷 武陵篇",
          description: '',
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
          type: "其他",
          color: "#409EFF",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      totalWordCount: 68,
    };
  }
}

/**
 * 创建作品服务实例
 */
export const createWorkService = (savePath: string): WorkService => {
  return new WorkService(savePath);
};