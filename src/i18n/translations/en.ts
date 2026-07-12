/**
 * English (en) — UI strings
 *
 * Keys not present here will fall back to the default locale (zh).
 */

import type { UIStrings } from '../types';

export const uiStrings: UIStrings = {
  // ── Navigation ──────────────────────────────────────────────
  'nav.home': 'Home',
  'nav.posts': 'Posts',
  'nav.categories': 'Categories',
  'nav.tags': 'Tags',
  'nav.archives': 'Archives',
  'nav.friends': 'Friends',
  'nav.about': 'About',
  'nav.music': 'Music',
  'nav.weekly': 'Weekly',
  'nav.bangumi': 'Bangumi',
  'nav.resources': 'Resources',
  'nav.tempmail': 'Temp Mail',
  'nav.drive': 'Drive',

  // ── Drive ──────────────────────────────────────────────────
  'drive.uploadTitle': 'Upload files (public sharing, up to 500MB each)',
  'drive.pageDesc': 'Public file sharing: upload to get a direct link instantly. Files are stored in R2 and served via EdgeOne in China.',
  'drive.verifyFirst': 'Please complete the human verification first',
  'drive.uploading': 'Uploading {pct}%',
  'drive.uploadingBtn': 'Uploading…',
  'drive.uploadBtn': 'Upload & generate share link',
  'drive.sharedFiles': 'Shared files',
  'drive.refresh': 'Refresh',
  'drive.empty': 'No files yet',
  'drive.autoExpire': 'Files are auto-deleted 24 hours after upload — download in time',
  'drive.download': 'Download',
  'drive.preview': 'Preview',
  'drive.errorInit': 'Failed to get upload URL',
  'drive.errorConfirm': 'Failed to confirm upload',
  'drive.errorUpload': 'Upload failed',
  'drive.errorNet': 'Network error (the direct Cloudflare host may be blocked; please retry)',

  // ── Shorten ─────────────────────────────────────────────
  'nav.shorten': 'Short URL',
  'shorten.pageDesc': 'Turn long links into short ones: paste a URL to get a qiyuan.icu/api/s/ short address that never expires.',
  'shorten.urlPlaceholder': 'Paste the URL to shorten (https://…)',
  'shorten.slugPlaceholder': 'Optional: custom slug (alphanumeric _ -, 3-32 chars)',
  'shorten.generate': 'Shorten',
  'shorten.generating': 'Shortening…',
  'shorten.urlRequired': 'Please enter a URL to shorten',
  'shorten.errorGeneric': 'Failed to create, please retry',
  'shorten.copied': 'Copied',

  // ── Audio (article read-aloud) ─────────────────────────
  'audio.listen': 'Listen to this article',
  'audio.play': 'Play',
  'audio.pause': 'Pause',
  'audio.seek': 'Seek',
  'audio.speed': 'Speed',
  'audio.failed': 'Audio failed to load',


  // ── Common ──────────────────────────────────────────────────
  'common.search': 'Search',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.loading': 'Loading...',
  'common.noResults': 'No results found',
  'common.backToTop': 'Back to top',
  'common.darkMode': 'Dark mode',
  'common.lightMode': 'Light mode',
  'common.toggleTheme': 'Toggle theme',
  'common.language': 'Language',
  'common.toc': 'Table of Contents',
  'common.expand': 'Expand',
  'common.collapse': 'Collapse',
  'common.menuLabel': '{name} menu',

  // ── Post ────────────────────────────────────────────────────
  'post.readMore': 'Read more',
  'post.totalPosts': '{count} posts',
  'post.stickyPosts': 'Pinned Posts',
  'post.postList': 'Posts',
  'post.featuredCategories': 'Featured Categories',
  'post.yearPosts': '{count} posts',
  'post.readingTime': '{time} min read',
  'post.wordCount': '{count} words',
  'post.publishedAt': 'Published {date}',
  'post.updatedAt': 'Updated {date}',
  'post.prevPost': 'Previous',
  'post.nextPost': 'Next',
  'post.relatedPosts': 'Related Posts',
  'post.seriesNavigation': 'Series Navigation',
  'post.seriesPrev': 'Previous',
  'post.seriesNext': 'Next',
  'post.fallbackNotice': 'This post is not yet available in {lang}. Showing the original.',
  'post.draft': 'Draft',
  'post.pinned': 'Pinned',
  'post.noPostsFound': 'No posts found',

  // ── Categories & Tags ───────────────────────────────────────
  'category.allCategories': 'All Categories',
  'category.postsInCategory': 'Posts in {name}',
  'category.totalCategories': '{count} categories',
  'category.categoryLabel': 'Category',
  'tag.allTags': 'All Tags',
  'tag.postsWithTag': 'Posts tagged "{name}"',
  'tag.totalTags': '{count} tags',
  'tag.all': 'All',
  'tag.postCount': '{count} posts',

  // ── Archives ────────────────────────────────────────────────
  'archives.title': 'Archives',
  'archives.totalPosts': '{count} posts',

  // ── Search ──────────────────────────────────────────────────
  'search.placeholder': 'Search by keyword',
  'search.label': 'Search this site',
  'search.clear': 'Clear',
  'search.loadMore': 'Load more results',
  'search.filters': 'Filters',
  'search.noResults': 'No results found',
  'search.manyResults': '[COUNT] results',
  'search.oneResult': '[COUNT] result',
  'search.altSearch': 'No results found. Showing results for [DIFFERENT_TERM]',
  'search.suggestion': 'No results found. Try searching for:',
  'search.searching': 'Searching [SEARCH_TERM]...',
  'search.dialogTitle': 'Search Posts',
  'search.dialogHint': 'Type keywords to search blog posts',
  'search.dialogClose': 'Close',
  'search.dialogSelect': 'Select',
  'search.dialogOpen': 'Open',
  'search.modeKeyword': 'Keyword',
  'search.modeSemantic': 'Semantic',
  'search.semanticPlaceholder': 'Describe what you want in natural language, e.g. "how to use ChatGPT steadily in China"',
  'search.semanticEmpty': 'No semantically related posts found',

  // ── Friends ─────────────────────────────────────────────────
  'friends.title': 'Friends',
  'friends.applyTitle': 'Apply for Friend Link',
  'friends.siteName': 'Site Name',
  'friends.siteUrl': 'Site URL',
  'friends.ownerName': 'Name',
  'friends.siteDesc': 'Description',
  'friends.avatarUrl': 'Avatar URL',
  'friends.themeColor': 'Theme Color',
  'friends.submit': 'Submit',
  'friends.copySuccess': 'Copied to clipboard',
  'friends.copyFail': 'Copy failed, please copy manually',
  'friends.generateFormat': 'Generate Format',
  'friends.copyFormat': 'Copy Format',
  'friends.sitePlaceholder': 'My Blog',
  'friends.ownerPlaceholder': 'Your name',
  'friends.urlPlaceholder': 'https://your-site.com',
  'friends.descPlaceholder': 'Brief description...',
  'friends.imagePlaceholder': 'https://...',
  'friends.previewTitle': 'Config Preview',
  'friends.copyConfig': 'Copy Config',
  'friends.copiedConfig': 'Copied!',
  'friends.hint': 'Tip: Copy the code above and paste it in the comment section below.',

  // ── Code Block ──────────────────────────────────────────────
  'code.copy': 'Copy code',
  'code.copied': 'Copied!',
  'code.fullscreen': 'Full screen',
  'code.exitFullscreen': 'Exit full screen',
  'code.wrapLines': 'Word wrap',
  'code.viewSource': 'View source',
  'code.viewRendered': 'View rendered',

  // ── Diagram / Infographic ───────────────────────────────────
  'diagram.fullscreen': 'Full screen',
  'diagram.exitFullscreen': 'Exit full screen',
  'diagram.viewSource': 'View source',
  'diagram.zoomIn': 'Zoom in',
  'diagram.zoomOut': 'Zoom out',
  'diagram.resetZoom': 'Reset zoom',
  'diagram.fitToScreen': 'Fit to screen',
  'diagram.download': 'Download image',

  // ── Image Lightbox ──────────────────────────────────────────
  'image.zoomIn': 'Zoom in',
  'image.zoomOut': 'Zoom out',
  'image.resetZoom': 'Reset',
  'image.resetZoomRotate': 'Reset zoom and rotation',
  'image.rotate': 'Rotate 90°',
  'image.close': 'Close',
  'image.prev': 'Previous',
  'image.next': 'Next',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': 'Double-click to zoom · Scroll/pinch to scale',
  'image.hintMobile': 'Double-tap to zoom · Pinch to scale',

  // ── Media Controls ──────────────────────────────────────────
  'media.play': 'Play',
  'media.pause': 'Pause',
  'media.mute': 'Mute',
  'media.unmute': 'Unmute',
  'media.fullscreen': 'Full screen',
  'media.exitFullscreen': 'Exit full screen',
  'media.pictureInPicture': 'Picture in picture',
  'media.playbackSpeed': 'Playback speed',
  'media.download': 'Download',
  'media.prevTrack': 'Previous track',
  'media.nextTrack': 'Next track',
  'media.volume': 'Volume {percent}%',
  'media.progress': 'Playback progress',
  'media.playModeOrder': 'Sequential',
  'media.playModeRandom': 'Shuffle',
  'media.playModeLoop': 'Repeat one',

  // ── Footer ──────────────────────────────────────────────────
  'footer.poweredBy': 'Powered by {name}',
  'footer.totalPosts': '{count} posts',
  'footer.totalWords': '{count} words',
  'footer.totalWordsTitle': 'Total words',
  'footer.readingTimeTitle': 'Total reading time',
  'footer.postCountTitle': 'Total posts',
  'footer.runningDays': 'Running for {days} days',
  'footer.wordUnit': 'words',
  'footer.postUnit': 'posts',

  // ── Analytics Stats ─────────────────────────────────────────
  'stats.pageviews': 'Page views',

  // ── Pagination ──────────────────────────────────────────────
  'pagination.prev': 'Previous',
  'pagination.next': 'Next',
  'pagination.page': 'Page {page}',
  'pagination.currentPage': 'Page {page}, current page',
  'pagination.of': 'of {total}',

  // ── Breadcrumb ──────────────────────────────────────────────
  'breadcrumb.home': 'Home',
  'breadcrumb.goToCategory': 'Go to {name} category',

  // ── Floating Group ──────────────────────────────────────────
  'floating.backToTop': 'Back Top',
  'floating.scrollToBottom': 'Scroll Bottom',
  'floating.toggleTheme': 'Toggle theme',
  'floating.christmas': 'Toggle Christmas effects',
  'floating.bgm': 'Background music',
  'floating.toggleToolbar': 'Toggle toolbar',

  // ── Chat ────────────────────────────────────────────────
  'chat.askArticle': 'Ask AI about this article',
  'chat.scopedPrefix': 'Discussing: ',
  'chat.exitScope': 'Exit article scope',

  // ── Announcement ────────────────────────────────────────────
  'announcement.title': 'Announcements',
  'announcement.new': 'New',
  'announcement.count': '{count} announcements',
  'announcement.unreadCount': '{count} unread',
  'announcement.markAllRead': 'Mark all read',
  'announcement.dismiss': 'Dismiss',
  'announcement.learnMore': 'Learn more',
  'announcement.empty': 'No announcements',
  'announcement.emptyHint': 'New announcements will appear here',

  // ── Quiz ────────────────────────────────────────────────────
  'quiz.check': 'Check',
  'quiz.correct': 'Correct!',
  'quiz.incorrect': 'Incorrect, try again',
  'quiz.incorrectAnswer': 'Incorrect. The correct answer is {answer}.',
  'quiz.submitAnswer': 'Submit ({count} selected)',
  'quiz.commonMistakes': 'Common mistakes:',
  'quiz.parseFailed': 'Failed to parse quiz',
  'quiz.showAnswer': 'Show answer',
  'quiz.hideAnswer': 'Hide answer',
  'quiz.reset': 'Reset',
  'quiz.score': 'Score: {score}/{total}',
  'quiz.completed': 'All done!',
  'quiz.fillBlank': 'Type your answer...',
  'quiz.selectOption': 'Select an option',
  'quiz.single': 'Single Choice',
  'quiz.multi': 'Multiple Choice',
  'quiz.trueFalse': 'True or False',
  'quiz.fill': 'Fill in the Blank',
  'quiz.optionTrue': 'True',
  'quiz.optionFalse': 'False',
  'quiz.clickToReveal': 'Click to reveal answer',
  'quiz.quizOptions': '{type} options',
  'quiz.trueFalseCorrect': 'Correct!',
  'quiz.trueFalseIncorrect': 'Incorrect. The statement is {answer}.',

  // ── Encrypted Block ─────────────────────────────────────────
  'encrypted.locked': 'Encrypted content',
  'encrypted.placeholder': 'Enter password to unlock',
  'encrypted.submit': 'Unlock',
  'encrypted.incorrect': 'Wrong password',

  // ── Encrypted Post ─────────────────────────────────────────
  'encrypted.post.title': 'This post is encrypted',
  'encrypted.post.description': 'Please enter the password to view the content',
  'encrypted.post.rssNotice': 'This post is encrypted. Please view it on the website.',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'Page Not Found',
  'notFound.description': 'The page you are looking for does not exist',
  'notFound.backHome': 'Back to Home',
  'notFound.browseArchives': 'Browse Archives',
  'notFound.message': 'Meow? The page was eaten~',

  // ── Category Stats ────────────────────────────────────────
  'category.subCategoryCount': '{count} subcategories',
  'category.postCount': '{count} posts',

  // ── Post Card ─────────────────────────────────────────────
  'post.readingTimeTooltip': 'Estimated reading time: {time}',

  // ── Featured Series ─────────────────────────────────────────
  'series.latestPost': 'Latest',
  'series.viewAll': 'View all',
  'series.postCount': '{count} posts',
  'series.noPosts': 'No posts in this series',
  'series.rss': 'RSS Feed',
  'series.chromeExtension': 'Chrome Extension',
  'series.docs': 'Documentation',

  // ── Home Info ───────────────────────────────────────────────
  'homeInfo.articles': 'Articles',
  'homeInfo.categories': 'Categories',
  'homeInfo.tags': 'Tags',

  // ── Drawer ──────────────────────────────────────────────────
  'drawer.navMenu': 'Navigation menu',
  'drawer.close': 'Close menu',
  'drawer.openMenu': 'Open menu',

  // ── Summary Panel ───────────────────────────────────────────
  'summary.description': 'Summary',
  'summary.ai': 'AI Summary',
  'summary.auto': 'Summary',

  // ── Random Posts ────────────────────────────────────────────
  'post.randomPosts': 'Random Posts',

  // ── Tag Component ───────────────────────────────────────────
  'tag.expandAll': 'Show all',
  'tag.viewTagPosts': 'View {count} posts tagged "{tag}"',

  // ── Audio Player ────────────────────────────────────────────
  'audio.loading': 'Loading playlist...',
  'audio.loadError': 'Load failed: {error}',
  'audio.retry': 'Retry',
  'audio.empty': 'No tracks',
  'audio.listTab': 'List {index}',
  'audio.closePanel': 'Close panel',

  // ── Table of Contents ───────────────────────────────────────
  'toc.title': 'Table of Contents',
  'toc.expand': 'Expand table of contents',
  'toc.empty': 'No headings',

  // ── Embed ─────────────────────────────────────────────────
  'embed.loadingTweet': 'Loading Tweet',

  // ── Search Shortcut ───────────────────────────────────────
  'search.searchShortcut': 'Search ({shortcut})',

  // ── Sider Segmented ─────────────────────────────────────────
  'sider.overview': 'Overview',
  'sider.toc': 'Contents',
  'sider.series': 'Series',

  // ── Copy Link ───────────────────────────────────────────────
  'cover.copyLink': 'Copy link',

  // ── Comment ────────────────────────────────────────────────
  'comment.prompt': 'If you enjoyed this, leave a comment~',
  'comment.loading': 'Loading…',
  'comment.empty': 'No comments yet. Be the first!',
  'comment.anonymous': 'Anonymous',
  'comment.placeholder': 'Write a comment… (paste an image to upload)',
  'comment.image': 'Image',
  'comment.uploading': 'Uploading…',
  'comment.submit': 'Post comment',
  'comment.posting': 'Posting…',
  'comment.emptyContent': 'Comment cannot be empty',
  'comment.uploadFailed': 'Image upload failed',
  'comment.submitFailed': 'Failed to post comment',
  'comment.poweredBy': 'Powered by Cloudflare KV + R2',

  // ── Bangumi ───────────────────────────────────────────────
  'bangumi.title': 'Bangumi',
  'bangumi.description': 'My media collection',
  'bangumi.anime': 'Anime',
  'bangumi.book': 'Books',
  'bangumi.music': 'Music',
  'bangumi.game': 'Games',
  'bangumi.real': 'Real',
  'bangumi.all': 'All',
  'bangumi.wish': 'Wish',
  'bangumi.collected': 'Completed',
  'bangumi.watching': 'Watching',
  'bangumi.onHold': 'On Hold',
  'bangumi.dropped': 'Dropped',
  'bangumi.noImage': 'No Image',
  'bangumi.noItems': 'No collections',
  'bangumi.error': 'Failed to load, please try again',
  'bangumi.retry': 'Retry',

  // ── Resources ──────────────────────────────────────────────
  'resources.title': 'Resources',
  'resources.description': 'Curated software, AI tools, and learning materials via cloud drive links',
  'resources.intro': 'Browse resources without signing in. Click a card to open the cloud drive download link.',
  'resources.searchPlaceholder': 'Search by name, description, or category…',
  'resources.clearFilters': 'Clear filters',
  'resources.allCategories': 'All',
  'resources.resultCount': '{count} resources',
  'resources.download': 'Get for free',
  'resources.empty': 'No matching resources found',
  'resources.loading': 'Loading…',
  'resources.error': 'Failed to load resources. Please try again later.',
  'resources.retry': 'Retry',

  // ── Resource Card ───────────────────────────────────────────
  'resources.noCover': 'No cover',
  'resources.uncategorized': 'Uncategorized',

  // ── Christmas Toggle ────────────────────────────────────────
  'christmas.pullDownOff': 'Pull down to turn off',
  'christmas.pullDownOn': 'Pull down to turn on',
  'christmas.turnOff': 'Turn off Christmas mode',
  'christmas.turnOn': 'Turn on Christmas mode',

  // ── Menu Icon ───────────────────────────────────────────────
  'menu.close': 'Close menu',
  'menu.open': 'Open menu',

  // ── Progress Circle ─────────────────────────────────────────
  'post.readingProgress': 'Reading progress',

  // ── Quiz Option ─────────────────────────────────────────────
  'quiz.optionLabel': 'Option {letter}',

  // ── Temp Mail ──────────────────────────────────────────────
  'tempMail.title': 'Temp Mail',
  'tempMail.domain': 'Domain',
  'tempMail.description':
    'Free disposable email for one-time use such as sign-up verification codes. Address auto-expires after 24 hours.',
  'tempMail.notConfigured': 'Temp mail domain is not configured yet. Please complete the setup in the site backend.',
  'tempMail.intro':
    'Click the button below to generate a random temporary address for receiving one-time emails like verification codes. The address is destroyed after 24 hours.',
  'tempMail.generate': 'Generate temp address',
  'tempMail.generating': 'Generating…',
  'tempMail.copy': 'Copy',
  'tempMail.copied': 'Copied',
  'tempMail.regenerate': 'Regenerate',
  'tempMail.inbox': 'Inbox',
  'tempMail.content': 'Message',
  'tempMail.selectToView': 'Select a message on the left to view its content',
  'tempMail.empty': 'No messages yet, waiting to receive…',
  'tempMail.from': 'From',
  'tempMail.subject': 'Subject',
  'tempMail.noSubject': '(no subject)',
  'tempMail.refresh': 'Refresh',
  'tempMail.autoRefresh': 'Auto-refresh',
  'tempMail.autoRefreshOn': 'Auto-refresh: On',
  'tempMail.autoRefreshOff': 'Auto-refresh: Off',
  'tempMail.lastChecked': 'Last checked: {time}',
  'tempMail.verifyWait': 'Running human verification, please wait a moment and try again…',
  'tempMail.expiresHint':
    'Note: some sites (especially domestic platforms and financial services) block disposable email domains. This service is for legitimate one-time use only — do not abuse it.',
};
