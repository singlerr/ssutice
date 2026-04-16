export type ScrapedNotice = {
  articleNo: string;
  title: string;
  url: string;
  date: string | null;
};

const API_BASE = 'https://backend.sssupport.shop';
const BOARD_NAME = '공지사항게시판';
const SITE_ORIGIN = 'https://stu.ssu.ac.kr';

interface PostDto {
  postId: number;
  title: string;
  date: string;
  category?: string;
}

interface ApiResponse {
  data: {
    postListResDto: PostDto[];
    pageInfo?: { totalElements?: number };
  };
}

export async function scrapeStudentCouncil(): Promise<ScrapedNotice[]> {
  const encoded = encodeURIComponent(BOARD_NAME);
  const url = `${API_BASE}/board/${encoded}/posts/search?page=0&take=30&q=&groupCode=중앙기구`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SSUNoticeBot/1.0)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`student-council API failed: ${res.status}`);

  const json: ApiResponse = await res.json();
  const posts = json?.data?.postListResDto ?? [];

  return posts.map((post) => ({
    articleNo: String(post.postId),
    title: post.title,
    url: `${SITE_ORIGIN}/notice/${post.postId}`,
    date: post.date ? post.date.split('T')[0].split(' ')[0].replace(/\//g, '-') : null,
  }));
}
