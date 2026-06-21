/**
 * 公共工具函数
 */

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

/**
 * 清理文件名，移除特殊字符
 * @param name 原始文件名
 * @returns 安全的文件名
 */
export const sanitizeFileName = (name: string): string => {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
};

/**
 * 中文数字转换数组
 */
export const CHINESE_NUMBERS = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十'
];

/**
 * 数字转中文数字
 * @param num 数字
 * @returns 中文数字字符串
 */
export const numberToChinese = (num: number): string => {
  if (num <= 30) {
    return CHINESE_NUMBERS[num - 1];
  }
  return num.toString();
};

/**
 * 从文件名中提取卷序号（用于排序）
 * @param name 文件名
 * @returns 序号数字
 */
export const extractVolumeNumber = (name: string): number => {
  // 匹配中文数字
  const chineseMatch = name.match(/第([一二三四五六七八九十]+)卷/);
  if (chineseMatch) {
    const chineseNum = CHINESE_NUMBERS.indexOf(chineseMatch[1]);
    if (chineseNum !== -1) {
      return chineseNum + 1;
    }
  }
  
  // 匹配阿拉伯数字
  const numMatch = name.match(/第(\d+)卷/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  
  // 匹配文件名中的任意数字
  const anyNumMatch = name.match(/(\d+)/);
  if (anyNumMatch) {
    return parseInt(anyNumMatch[1], 10);
  }
  
  return 999; // 默认排在最后
};

/**
 * 从章节名中提取序号（用于排序）
 * @param name 章节名
 * @returns 序号数字
 */
export const extractChapterNumber = (name: string): number => {
  // 匹配中文数字
  const chineseMatch = name.match(/第([一二三四五六七八九十]+)章/);
  if (chineseMatch) {
    const chineseNum = CHINESE_NUMBERS.indexOf(chineseMatch[1]);
    if (chineseNum !== -1) {
      return chineseNum + 1;
    }
  }
  
  // 匹配阿拉伯数字
  const numMatch = name.match(/第(\d+)章/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  
  // 匹配文件名中的任意数字
  const anyNumMatch = name.match(/(\d+)/);
  if (anyNumMatch) {
    return parseInt(anyNumMatch[1], 10);
  }
  
  return 999; // 默认排在最后
};

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * 格式化日期
 * @param timestamp 时间戳
 * @returns 格式化的日期字符串
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 计算字数
 * @param content 内容字符串
 * @returns 字数
 */
export const countWords = (content: string): number => {
  // 移除空格和标点符号，只计算实际字符
  return content.replace(/\s/g, '').length;
};

/**
 * 获取角色类型名称
 * @param role 角色类型
 * @returns 角色类型名称
 */
export const getRoleName = (role: string): string => {
  const roleNames: Record<string, string> = {
    protagonist: '主角',
    supporting: '配角',
    antagonist: '反派',
    other: '其他'
  };
  return roleNames[role] || '其他';
};