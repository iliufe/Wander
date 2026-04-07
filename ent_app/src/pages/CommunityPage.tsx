import { useRef, useState, type ChangeEvent } from "react";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import { useWander } from "../wander-state";

type CommunityPost = {
  id: string;
  author: string;
  handle: string;
  location: string;
  theme: {
    zh: string;
    en: string;
  };
  body: {
    zh: string;
    en: string;
  };
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  shared: boolean;
  image?: string | null;
};

const seedPosts: CommunityPost[] = [
  {
    id: "post-1",
    author: "Miya",
    handle: "@miya_afterclass",
    location: "西浦创业家学院（太仓）",
    theme: {
      zh: "川菜 + 湖边散步 + 顺路补给",
      en: "Sichuan + lakeside walk + grocery stop",
    },
    body: {
      zh: "今天下课后只剩两个多小时，本来不想动脑子，结果用 Wander 很快拼出一条顺路路线，吃完再去湖边走一小段，情绪切换特别明显。",
      en: "I only had a little over two hours after class today. Wander stitched together a low-friction route fast, and that short lakeside walk really changed my mood.",
    },
    likes: 128,
    comments: 18,
    shares: 11,
    liked: false,
    shared: false,
    image: buildDemoCommunityImage(["Lake Walk", "Warm Dinner"], ["#ffb05f", "#f06b42"], ["#0f8f83", "#173246"]),
  },
  {
    id: "post-2",
    author: "Aria",
    handle: "@aria_afterwork",
    location: "静安",
    theme: {
      zh: "咖啡 + 书店 + 雨天室内替代",
      en: "Cafe + bookstore + rainy indoor fallback",
    },
    body: {
      zh: "今天上海突然下雨，原本想散步，最后直接切到书店和小展厅。这个自动替换逻辑对下班后真的很重要，不然我大概率就回家躺着了。",
      en: "It suddenly rained in Shanghai, so I switched from walking to a bookstore and a small gallery. That auto-swap logic matters a lot after work.",
    },
    likes: 203,
    comments: 26,
    shares: 34,
    liked: true,
    shared: false,
    image: buildDemoCommunityImage(["Rain Backup", "Bookstore"], ["#1a364b", "#2f6b7b"], ["#f5d77f", "#efb75f"]),
  },
  {
    id: "post-3",
    author: "Theo",
    handle: "@theo_weekend",
    location: "黄浦",
    theme: {
      zh: "轻晚餐 + 滨水散步 + 甜品收尾",
      en: "Dinner + riverside walk + dessert finish",
    },
    body: {
      zh: "最喜欢的是路线不是那种打卡清单，而是真的像给傍晚留了一个温和的出口。最后那站甜品也很像一个句号。",
      en: "What I like most is that the route feels less like a checklist and more like a soft way to spend an evening. The dessert stop really closes the loop.",
    },
    likes: 176,
    comments: 14,
    shares: 20,
    liked: false,
    shared: true,
    image: null,
  },
];

export function CommunityPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { parsed, location } = useWander();
  const [draft, setDraft] = useState("");
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [posts, setPosts] = useState(seedPosts);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePublish = () => {
    if (!draft.trim() && !draftImage) {
      return;
    }

    const themeTextZh = parsed.categories.map((category) => getLocalizedCategoryLabel(category, "zh")).join(" / ");
    const themeTextEn = parsed.categories.map((category) => getLocalizedCategoryLabel(category, "en")).join(" / ");

    setPosts((current) => [
      {
        id: `post-${Date.now()}`,
        author: "You",
        handle: "@wander_user",
        location: location.label,
        theme: {
          zh: themeTextZh,
          en: themeTextEn,
        },
        body: {
          zh: draft.trim() || "今天先发一张图片，路线灵感也一起留在这里。",
          en: draft.trim() || "Posting the photo first and keeping the route idea here too.",
        },
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        shared: false,
        image: draftImage,
      },
      ...current,
    ]);
    setDraft("");
    setDraftImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updatePost = (id: string, updater: (post: CommunityPost) => CommunityPost) => {
    setPosts((current) => current.map((post) => (post.id === id ? updater(post) : post)));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const imageDataUrl = await readFileAsDataUrl(file);
    setDraftImage(imageDataUrl);
    event.target.value = "";
  };

  const clearDraftImage = () => {
    setDraftImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <section className="page-hero surface">
        <span className="eyebrow">{copy.community.eyebrow}</span>
        <h1>{copy.community.title}</h1>
        <p>{copy.community.description}</p>
      </section>

      <section className="community-grid">
        <section className="surface panel community-feed-panel">
          <div className="section-heading">
            <span className="eyebrow">{copy.community.composerTitle}</span>
            <h2>{copy.community.feedTitle}</h2>
            <p>{copy.community.feedDesc}</p>
          </div>

          <div className="community-composer">
            <textarea
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={copy.community.composerPlaceholder}
            />
            <div className="community-attachment-row">
              <label className="ghost-button community-upload-button" htmlFor="community-image-input">
                {draftImage ? copy.community.changePhoto : copy.community.addPhoto}
              </label>
              <input
                ref={fileInputRef}
                id="community-image-input"
                className="community-file-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <span className="community-upload-hint">
                {draftImage ? copy.community.photoReady : copy.community.photoHint}
              </span>
            </div>
            {draftImage ? (
              <div className="community-image-preview-card">
                <img
                  className="community-image-preview"
                  src={draftImage}
                  alt={copy.community.photoReady}
                />
                <button className="ghost-button" type="button" onClick={clearDraftImage}>
                  {copy.community.removePhoto}
                </button>
              </div>
            ) : null}
            <div className="community-composer-footer">
              <span>{copy.community.postingHint}</span>
              <button className="route-action" type="button" onClick={handlePublish}>
                {copy.community.publish}
              </button>
            </div>
          </div>

          <div className="community-feed">
            {posts.map((post) => (
              <article className="community-post" key={post.id}>
                <div className="community-post-head">
                  <div className="community-post-author">
                    <div className="community-avatar">{post.author.slice(0, 1)}</div>
                    <div>
                      <strong>{post.author}</strong>
                      <span>{post.handle}</span>
                    </div>
                  </div>
                  <div className="community-post-meta">
                    <span>{post.location}</span>
                    <span>{post.theme[language]}</span>
                  </div>
                </div>
                <p className="community-post-body">{post.body[language]}</p>
                {post.image ? (
                  <div className="community-post-image-shell">
                    <img
                      className="community-post-image"
                      src={post.image}
                      alt={`${post.author} ${language === "zh" ? "分享的图片" : "shared photo"}`}
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="post-actions">
                  <button
                    className={`ghost-button post-action-button ${post.liked ? "is-active" : ""}`}
                    type="button"
                    onClick={() =>
                      updatePost(post.id, (current) => ({
                        ...current,
                        liked: !current.liked,
                        likes: current.likes + (current.liked ? -1 : 1),
                      }))
                    }
                  >
                    {post.liked ? copy.community.liked : copy.community.like} · {post.likes}
                  </button>
                  <button
                    className="ghost-button post-action-button"
                    type="button"
                    onClick={() =>
                      updatePost(post.id, (current) => ({
                        ...current,
                        comments: current.comments + 1,
                      }))
                    }
                  >
                    {copy.community.comment} · {post.comments}
                  </button>
                  <button
                    className={`ghost-button post-action-button ${post.shared ? "is-active" : ""}`}
                    type="button"
                    onClick={() =>
                      updatePost(post.id, (current) => ({
                        ...current,
                        shared: !current.shared,
                        shares: current.shares + (current.shared ? -1 : 1),
                      }))
                    }
                  >
                    {post.shared ? copy.community.shared : copy.community.share} · {post.shares}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="surface panel community-side-panel">
          <div className="section-heading">
            <span className="eyebrow">{copy.community.sidebarTitle}</span>
            <h2>{copy.community.hotThemes}</h2>
            <p>{copy.community.sidebarDesc}</p>
          </div>
          <div className="community-hot-tags">
            <span className="stop-tag">After Work</span>
            <span className="stop-tag">After Class</span>
            <span className="stop-tag">Sichuan Dinner</span>
            <span className="stop-tag">Rain Backup</span>
            <span className="stop-tag">Lake Walk</span>
            <span className="stop-tag">Quick Grocery</span>
          </div>
          <div className="summary-list single-column">
            <li>
              <span>{language === "zh" ? "帖子" : "Posts"}</span>
              <strong>{posts.length}</strong>
            </li>
            <li>
              <span>{language === "zh" ? "点赞" : "Likes"}</span>
              <strong>{posts.reduce((sum, post) => sum + post.likes, 0)}</strong>
            </li>
            <li>
              <span>{language === "zh" ? "转发" : "Shares"}</span>
              <strong>{posts.reduce((sum, post) => sum + post.shares, 0)}</strong>
            </li>
          </div>
        </aside>
      </section>
    </>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file"));
    };

    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function buildDemoCommunityImage(
  labels: [string, string],
  startColors: [string, string],
  endColors: [string, string]
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="780" viewBox="0 0 1200 780">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColors[0]}" />
          <stop offset="100%" stop-color="${startColors[1]}" />
        </linearGradient>
        <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${endColors[0]}" />
          <stop offset="100%" stop-color="${endColors[1]}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="780" rx="48" fill="url(#bg)" />
      <circle cx="210" cy="150" r="120" fill="rgba(255,255,255,0.16)" />
      <circle cx="1040" cy="110" r="92" fill="rgba(255,255,255,0.12)" />
      <circle cx="980" cy="640" r="180" fill="rgba(255,255,255,0.08)" />
      <rect x="84" y="118" width="466" height="544" rx="36" fill="rgba(255,248,241,0.16)" stroke="rgba(255,255,255,0.26)" />
      <rect x="618" y="170" width="498" height="438" rx="40" fill="url(#card)" />
      <path d="M170 520 C 280 410, 410 450, 522 338" stroke="rgba(255,255,255,0.86)" stroke-width="18" fill="none" stroke-linecap="round" />
      <circle cx="172" cy="518" r="24" fill="#fff7f2" />
      <circle cx="352" cy="436" r="22" fill="#fff7f2" />
      <circle cx="524" cy="338" r="26" fill="#fff7f2" />
      <text x="118" y="150" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="32" font-weight="700">WANDER</text>
      <text x="118" y="220" fill="#ffffff" font-family="Arial, sans-serif" font-size="64" font-weight="700">${labels[0]}</text>
      <text x="118" y="294" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif" font-size="50" font-weight="600">${labels[1]}</text>
      <text x="118" y="606" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif" font-size="28">after work / after class / low-friction wandering</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
