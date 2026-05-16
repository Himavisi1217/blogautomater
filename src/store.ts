// Simple in-memory store for generated blogs (persisted to localStorage)
export interface BlogPost {
  id: string;
  title: string;
  content: string;
  mainKeyword: string;
  secondaryKeywords: string[];
  provider: string;
  generatedAt: string;
  meta?: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    excerpt: string;
    slug: string;
    keywords?: string[];
  };
  strapiId?: number;
  status: 'generated' | 'saved' | 'published';
}

const STORAGE_KEY = 'blogforge_posts';

export function getBlogs(): BlogPost[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveBlog(blog: BlogPost): void {
  const blogs = getBlogs();
  const idx = blogs.findIndex(b => b.id === blog.id);
  if (idx >= 0) blogs[idx] = blog;
  else blogs.unshift(blog);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blogs));
}

export function deleteBlog(id: string): void {
  const blogs = getBlogs().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blogs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
