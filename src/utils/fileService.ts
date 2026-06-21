/**
 * 文件操作服务
 * 提供统一的文件读写接口
 */

import { join } from '@tauri-apps/api/path';
import { mkdir, writeTextFile, readTextFile, readDir, exists, remove, rename } from '@tauri-apps/plugin-fs';
import type { Work, Volume, Chapter, Character, OutlineItem, Inspiration } from '../types';
import { sanitizeFileName, extractVolumeNumber, extractChapterNumber, generateId } from '../utils/utils';

/**
 * 文件服务类
 */
export class FileService {
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
   * 确保目录存在
   */
  async ensureDir(path: string): Promise<void> {
    if (!await exists(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  /**
   * 获取作品文件夹路径
   */
  async getWorkFolder(workTitle: string): Promise<string> {
    return await join(this.savePath, sanitizeFileName(workTitle));
  }

  /**
   * 获取卷文件夹路径
   */
  async getVolumeFolder(workTitle: string, volumeTitle: string): Promise<string> {
    return await join(this.savePath, sanitizeFileName(workTitle), sanitizeFileName(volumeTitle));
  }

  /**
   * 保存作品简介
   */
  async saveDescription(workTitle: string, description: string): Promise<void> {
    const workFolder = await this.getWorkFolder(workTitle);
    await this.ensureDir(workFolder);
    const descPath = await join(workFolder, '简介.md');
    await writeTextFile(descPath, description);
  }

  /**
   * 读取作品简介
   */
  async readDescription(workTitle: string): Promise<string> {
    const workFolder = await this.getWorkFolder(workTitle);
    const descPath = await join(workFolder, '简介.md');
    if (await exists(descPath)) {
      return await readTextFile(descPath);
    }
    return '';
  }

  /**
   * 保存卷信息
   */
  async saveVolume(workTitle: string, volume: Volume): Promise<void> {
    const volFolder = await this.getVolumeFolder(workTitle, volume.title);
    await this.ensureDir(volFolder);
    
    // 保存卷信息文件
    const volInfoPath = await join(volFolder, `${sanitizeFileName(volume.title)}.md`);
    const volInfoContent = `# ${volume.title}\n\n${volume.description}`;
    await writeTextFile(volInfoPath, volInfoContent);
  }

  /**
   * 保存章节
   */
  async saveChapter(workTitle: string, volumeTitle: string | null, chapter: Chapter): Promise<void> {
    const folder = volumeTitle
      ? await this.getVolumeFolder(workTitle, volumeTitle)
      : await this.getWorkFolder(workTitle);
    
    await this.ensureDir(folder);
    
    // 检查是否有旧文件需要删除（标题被修改的情况）
    const existingFiles = await readDir(folder);
    for (const entry of existingFiles) {
      if (entry.isFile && entry.name?.endsWith('.md') && 
          entry.name !== '简介.md' && 
          entry.name !== `${sanitizeFileName(volumeTitle || '')}.md`) {
        const oldPath = await join(folder, entry.name);
        const oldContent = await readTextFile(oldPath);
        const lines = oldContent.split('\n');
        const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
        
        // 如果文件内容标题匹配当前章节标题，但文件名不匹配，说明标题被修改了
        if (titleMatch && titleMatch[1].trim() === chapter.title && 
            entry.name !== `${sanitizeFileName(chapter.title)}.md`) {
          await remove(oldPath);
          console.log(`删除旧章节文件: ${entry.name} (标题已修改为 ${chapter.title})`);
        }
      }
    }
    
    const chapPath = await join(folder, `${sanitizeFileName(chapter.title)}.md`);
    await writeTextFile(chapPath, `# ${chapter.title}\n\n${chapter.content}`);
  }

  /**
   * 保存角色
   */
  async saveCharacter(workTitle: string, character: Character): Promise<void> {
    const charFolder = await join(this.savePath, sanitizeFileName(workTitle), '角色');
    await this.ensureDir(charFolder);
    
    const charPath = await join(charFolder, `${sanitizeFileName(character.name)}.md`);
    const charContent = `# ${character.name}\n\n角色类型: ${character.role}\n\n描述: ${character.description}\n\n性格: ${character.personality}\n\n背景: ${character.background}\n\n其他: ${character.other}`;
    await writeTextFile(charPath, charContent);
  }

  /**
   * 保存大纲
   */
  async saveOutline(workTitle: string, outlineItems: OutlineItem[]): Promise<void> {
    const outlineFolder = await join(this.savePath, sanitizeFileName(workTitle), '大纲');
    await this.ensureDir(outlineFolder);
    
    const outlinePath = await join(outlineFolder, '大纲.md');
    const outlineContent = outlineItems
      .filter(item => item.parentId === 'outline-root')
      .map(item => {
        // 转义内容中的标题格式，避免解析错误
        const escapedContent = item.content.replace(/^#/gm, '\\#');
        return `# ${item.title}\n\n${escapedContent}`;
      })
      .join('\n\n');
    
    await writeTextFile(outlinePath, outlineContent);
  }

  /**
   * 保存灵感
   */
  async saveInspiration(workTitle: string, inspiration: Inspiration): Promise<void> {
    const inspFolder = await join(this.savePath, sanitizeFileName(workTitle), '灵感');
    await this.ensureDir(inspFolder);
    
    const inspPath = await join(inspFolder, `${sanitizeFileName(inspiration.title)}.md`);
    const inspContent = `# ${inspiration.title}\n\n类型: ${inspiration.type}\n\n${inspiration.content}`;
    await writeTextFile(inspPath, inspContent);
  }

  /**
   * 删除卷
   */
  async deleteVolume(workTitle: string, volumeTitle: string): Promise<void> {
    const volFolder = await this.getVolumeFolder(workTitle, volumeTitle);
    if (await exists(volFolder)) {
      await remove(volFolder, { recursive: true });
    }
  }

  /**
   * 删除章节
   */
  async deleteChapter(workTitle: string, volumeTitle: string | null, chapterTitle: string): Promise<void> {
    const folder = volumeTitle
      ? await this.getVolumeFolder(workTitle, volumeTitle)
      : await this.getWorkFolder(workTitle);
    
    const chapPath = await join(folder, `${sanitizeFileName(chapterTitle)}.md`);
    if (await exists(chapPath)) {
      await remove(chapPath);
    }
  }

  /**
   * 删除角色
   */
  async deleteCharacter(workTitle: string, characterName: string): Promise<void> {
    const charFolder = await join(this.savePath, sanitizeFileName(workTitle), '角色');
    const charPath = await join(charFolder, `${sanitizeFileName(characterName)}.md`);
    if (await exists(charPath)) {
      await remove(charPath);
    }
  }

  /**
   * 删除灵感
   */
  async deleteInspiration(workTitle: string, inspirationTitle: string): Promise<void> {
    const inspFolder = await join(this.savePath, sanitizeFileName(workTitle), '灵感');
    const inspPath = await join(inspFolder, `${sanitizeFileName(inspirationTitle)}.md`);
    if (await exists(inspPath)) {
      await remove(inspPath);
    }
  }

  /**
   * 重命名卷文件夹
   */
  async renameVolume(workTitle: string, oldTitle: string, newTitle: string): Promise<void> {
    const oldFolder = await this.getVolumeFolder(workTitle, oldTitle);
    const newFolder = await this.getVolumeFolder(workTitle, newTitle);
    
    if (await exists(oldFolder)) {
      await rename(oldFolder, newFolder);
      
      // 更新卷信息文件
      const oldInfoPath = await join(newFolder, `${sanitizeFileName(oldTitle)}.md`);
      const newInfoPath = await join(newFolder, `${sanitizeFileName(newTitle)}.md`);
      
      if (await exists(oldInfoPath)) {
        await rename(oldInfoPath, newInfoPath);
        // 更新文件内容
        const content = await readTextFile(newInfoPath);
        const updatedContent = content.replace(`# ${oldTitle}`, `# ${newTitle}`);
        await writeTextFile(newInfoPath, updatedContent);
      }
    }
  }

  /**
   * 读取作品列表
   */
  async readWorks(): Promise<Work[]> {
    const works: Work[] = [];
    
    if (!await exists(this.savePath)) {
      await mkdir(this.savePath, { recursive: true });
      return works;
    }
    
    const workFolders = await readDir(this.savePath);
    
    for (const workFolder of workFolders) {
      if (!workFolder.isDirectory || !workFolder.name) continue;
      
      const work: Work = {
        id: generateId(),
        title: workFolder.name,
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
      
      const workPath = await join(this.savePath, workFolder.name);
      
      // 读取简介
      work.description = await this.readDescription(workFolder.name);
      
      // 读取卷和章节
      const entries = await readDir(workPath);
      const volumeFolders = entries.filter(e => e.isDirectory && e.name !== '角色' && e.name !== '大纲' && e.name !== '灵感' && e.name !== '设定');
      
      // 按卷序号排序
      volumeFolders.sort((a, b) => {
        const numA = extractVolumeNumber(a.name || '');
        const numB = extractVolumeNumber(b.name || '');
        return numA - numB;
      });
      
      for (const volFolder of volumeFolders) {
        const volume: Volume = {
          id: generateId(),
          title: volFolder.name || '未命名卷',
          description: '',
          chapterIds: [],
          order: work.volumes.length
        };
        
        const volPath = await join(workPath, volFolder.name);
        
        // 读取卷信息文件
        const volInfoPath = await join(volPath, `${sanitizeFileName(volFolder.name || '')}.md`);
        if (await exists(volInfoPath)) {
          const volInfoContent = await readTextFile(volInfoPath);
          const lines = volInfoContent.split('\n');
          if (lines[0]?.startsWith('# ')) {
            volume.title = lines[0].substring(2).trim();
          }
          volume.description = lines.slice(2).join('\n').trim();
        }
        
        // 兼容旧的简介.md格式
        const volDescPath = await join(volPath, '简介.md');
        if (await exists(volDescPath) && !await exists(volInfoPath)) {
          volume.description = await readTextFile(volDescPath);
        }
        
        // 读取章节
        const chapterEntries = await readDir(volPath);
        const chapterFiles: { name: string; path: string }[] = [];
        
        for (const chapEntry of chapterEntries) {
          if (chapEntry.isFile && chapEntry.name?.endsWith('.md')) {
            // 过滤掉卷信息文件和简介.md
            if (chapEntry.name === `${sanitizeFileName(volFolder.name || '')}.md` || chapEntry.name === '简介.md') {
              continue;
            }
            chapterFiles.push({
              name: chapEntry.name,
              path: await join(volPath, chapEntry.name)
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
          const content = await readTextFile(chapFile.path);
          const lines = content.split('\n');
          let title = chapFile.name.replace('.md', '');
          let chapterContent = content;
          
          // 检查第一行是否是标题格式
          if (lines[0]?.startsWith('# ')) {
            title = lines[0].substring(2).trim();
            chapterContent = lines.slice(2).join('\n').trim();
          }
          
          const chapter: Chapter = {
            id: generateId(),
            title,
            content: chapterContent,
            wordCount: chapterContent.replace(/\s/g, '').length,
            chapterOutline: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          work.chapters.push(chapter);
          volume.chapterIds.push(chapter.id);
        }
        
        work.volumes.push(volume);
      }
      
      // 读取角色
      const charFolder = await join(workPath, '角色');
      if (await exists(charFolder)) {
        const charFiles = await readDir(charFolder);
        for (const charFile of charFiles) {
          if (charFile.isFile && charFile.name?.endsWith('.md')) {
            const charPath = await join(charFolder, charFile.name);
            const charContent = await readTextFile(charPath);
            const lines = charContent.split('\n');
            
            const character: Character = {
              id: generateId(),
              name: charFile.name.replace('.md', ''),
              role: 'other',
              avatar: '',
              description: '',
              personality: '',
              background: '',
              other: '',
              color: '#409EFF',
              updatedAt: Date.now()
            };
            
            // 解析角色信息
            if (lines[0]?.startsWith('# ')) {
              character.name = lines[0].substring(2).trim();
            }
            
            for (const line of lines) {
              if (line.startsWith('角色类型:')) {
                character.role = line.substring('角色类型:'.length).trim() as any;
              } else if (line.startsWith('描述:')) {
                character.description = line.substring('描述:'.length).trim();
              } else if (line.startsWith('性格:')) {
                character.personality = line.substring('性格:'.length).trim();
              } else if (line.startsWith('背景:')) {
                character.background = line.substring('背景:'.length).trim();
              } else if (line.startsWith('其他:')) {
                character.other = line.substring('其他:'.length).trim();
              }
            }
            
            work.characters.push(character);
          }
        }
      }
      
      // 读取大纲
      const outlineFolder = await join(workPath, '大纲');
      if (await exists(outlineFolder)) {
        const outlinePath = await join(outlineFolder, '大纲.md');
        if (await exists(outlinePath)) {
          const outlineContent = await readTextFile(outlinePath);
          const lines = outlineContent.split('\n');
          const items: OutlineItem[] = [];
          let currentItem: OutlineItem | null = null;
          let contentLines: string[] = [];
          
          for (const line of lines) {
            if (line.startsWith('# ') && !line.startsWith('\\#')) {
              // 保存上一个章纲
              if (currentItem) {
                currentItem.content = contentLines.join('\n').trim();
                items.push(currentItem);
              }
              
              // 开始新的章纲
              currentItem = {
                id: generateId(),
                title: line.substring(2).trim(),
                content: '',
                parentId: 'outline-root',
                order: items.length
              };
              contentLines = [];
            } else if (currentItem) {
              // 还原转义的标题格式
              const unescapedLine = line.replace(/^\\#/gm, '#');
              contentLines.push(unescapedLine);
            }
          }
          
          // 保存最后一个章纲
          if (currentItem) {
            currentItem.content = contentLines.join('\n').trim();
            items.push(currentItem);
          }
          
          work.outline = items;
        }
      }
      
      // 读取灵感
      const inspFolder = await join(workPath, '灵感');
      if (await exists(inspFolder)) {
        const inspFiles = await readDir(inspFolder);
        for (const inspFile of inspFiles) {
          if (inspFile.isFile && inspFile.name?.endsWith('.md')) {
            const inspPath = await join(inspFolder, inspFile.name);
            const inspContent = await readTextFile(inspPath);
            const lines = inspContent.split('\n');
            
            const inspiration: Inspiration = {
              id: generateId(),
              title: inspFile.name.replace('.md', ''),
              content: '',
              type: '其他',
              color: '#409EFF',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            
            // 解析灵感信息
            if (lines[0]?.startsWith('# ')) {
              inspiration.title = lines[0].substring(2).trim();
            }
            
            for (const line of lines) {
              if (line.startsWith('类型:')) {
                inspiration.type = line.substring('类型:'.length).trim();
              }
            }
            
            inspiration.content = lines.slice(2).join('\n').trim();
            work.inspirations.push(inspiration);
          }
        }
      }
      
      // 计算总字数
      work.totalWordCount = work.chapters.reduce((sum: any, chap: any) => sum + chap.wordCount, 0);
      
      works.push(work);
    }
    
    return works;
  }
}

/**
 * 创建文件服务实例
 */
export const createFileService = (savePath: string): FileService => {
  return new FileService(savePath);
};