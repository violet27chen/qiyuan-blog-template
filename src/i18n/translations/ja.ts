/**
 * 日本語 (ja) — UI 文字列
 *
 * ここに存在しないキーは、デフォルトのロケール (zh) にフォールバックします。
 */

import type { UIStrings } from '../types';

export const uiStrings: UIStrings = {
  // ── ナビゲーション ──────────────────────────────────────────────
  'nav.home': 'ホーム',
  'nav.posts': '投稿',
  'nav.categories': 'カテゴリー',
  'nav.tags': 'タグ',
  'nav.archives': 'アーカイブ',
  'nav.friends': '友達',
  'nav.about': 'ブログについて',
  'nav.music': '音楽',
  'nav.weekly': '週刊',
  'nav.bangumi': 'オタ活の記録',
  'nav.resources': 'リソース',
  'nav.tempmail': '临时メール',
  'nav.drive': 'ドライブ',

  // ── Drive ──────────────────────────────────────────────────
  'drive.uploadTitle': 'ファイルをアップロード（公開共有、最大 500MB/ファイル）',
  'drive.pageDesc': '公開ファイル共有：アップロードするだけで直リンクが生成されます。ファイルは R2 に保存され、中国国内は EdgeOne 経由で配信。',
  'drive.verifyFirst': '人間認証を先に完了してください',
  'drive.uploading': 'アップロード中 {pct}%',
  'drive.uploadingBtn': 'アップロード中…',
  'drive.uploadBtn': 'アップロードして共有リンクを生成',
  'drive.sharedFiles': '共有ファイル',
  'drive.refresh': '更新',
  'drive.empty': 'まだファイルがありません',
  'drive.autoExpire': 'ファイルはアップロードから24時間後に自動削除されます。お早めにダウンロードを',
  'drive.download': 'ダウンロード',
  'drive.preview': 'プレビュー',
  'drive.errorInit': 'アップロードURLの取得に失敗',
  'drive.errorConfirm': 'アップロード確認に失敗',
  'drive.errorUpload': 'アップロード失敗',
  'drive.errorNet': 'ネットワークエラー（Cloudflare への直接接続が遮断されている可能性があります。再試行してください）',

  // ── Shorten ─────────────────────────────────────────────
  'nav.shorten': '短縮URL',
  'shorten.pageDesc': '長いURLを短く：URLを貼り付けると、無期限の qiyuan.icu/api/s/ 短縮アドレスが作られます。',
  'shorten.urlPlaceholder': '短縮するURLを貼り付け（https://…）',
  'shorten.slugPlaceholder': '任意：カスタム短コード（英数字 _ -、3-32文字）',
  'shorten.generate': '短縮する',
  'shorten.generating': '処理中…',
  'shorten.urlRequired': '短縮するURLを入力してください',
  'shorten.errorGeneric': '生成失敗、再試行してください',
  'shorten.copied': 'コピー済み',

  // ── Audio (記事の読み上げ) ──────────────────────────────
  'audio.listen': '記事を読み上げる',
  'audio.play': '再生',
  'audio.pause': '一時停止',
  'audio.seek': 'シーク',
  'audio.speed': '速度',
  'audio.failed': '音声の読み込みに失敗しました',


  // ── 一般 ──────────────────────────────────────────────────
  'common.search': '検索',
  'common.close': '閉じる',
  'common.copy': 'コピー',
  'common.copied': 'コピーしました',
  'common.loading': '読み込み中...',
  'common.noResults': '結果が見つかりません',
  'common.backToTop': 'トップに戻る',
  'common.darkMode': 'ダークモード',
  'common.lightMode': 'ライトモード',
  'common.toggleTheme': 'テーマを切り替え',
  'common.language': '言語',
  'common.toc': '目次',
  'common.expand': '展開する',
  'common.collapse': '折りたたむ',
  'common.menuLabel': '{name}メニュー',

  // ── 投稿 ────────────────────────────────────────────────────
  'post.readMore': '詳細を読む',
  'post.totalPosts': '{count}件の投稿',
  'post.stickyPosts': '固定された投稿',
  'post.postList': '投稿',
  'post.featuredCategories': 'おすすめのカテゴリー',
  'post.yearPosts': '{count}件の投稿',
  'post.readingTime': '{time}分で読み終えます',
  'post.wordCount': '{count}文字',
  'post.publishedAt': '公開日: {date}',
  'post.updatedAt': '更新日: {date}',
  'post.prevPost': '前へ',
  'post.nextPost': '次へ',
  'post.relatedPosts': '関連した記事',
  'post.seriesNavigation': 'シリーズナビゲーション',
  'post.seriesPrev': '前へ',
  'post.seriesNext': '次へ',
  'post.fallbackNotice': 'この投稿は「{lang}」では表示できません。元の投稿を表示しています。',
  'post.draft': '下書き',
  'post.pinned': '固定済み',
  'post.noPostsFound': '投稿が見つかりません',

  // ── カテゴリーとタグ ───────────────────────────────────────
  'category.allCategories': 'すべてのカテゴリー',
  'category.postsInCategory': '{name}の投稿',
  'category.totalCategories': '{count}件のカテゴリー',
  'category.categoryLabel': 'カテゴリー',
  'tag.allTags': 'すべてのタグ',
  'tag.postsWithTag': '「{name}」のタグが付けられた投稿',
  'tag.totalTags': '{count}個のタグ',
  'tag.all': 'すべて',
  'tag.postCount': '{count}件の投稿',

  // ── アーカイブ ────────────────────────────────────────────────
  'archives.title': 'アーカイブ',
  'archives.totalPosts': '{count}件の投稿',

  // ── 検索 ──────────────────────────────────────────────────
  'search.placeholder': 'キーワードで検索',
  'search.label': 'このサイトを検索',
  'search.clear': 'クリア',
  'search.loadMore': 'さらに検索結果を読み込み',
  'search.filters': '絞り込み',
  'search.noResults': '検索結果は見つかりません',
  'search.manyResults': '[COUNT]件の検索結果',
  'search.oneResult': '[COUNT]件の検索結果',
  'search.altSearch': '結果が見つかりません。[DIFFERENT_TERM]の結果を表示しています。',
  'search.suggestion': '検索結果が見つかりません。 こちらの検索をお試しください:',
  'search.searching': '[SEARCH_TERM]を検索中...',
  'search.dialogTitle': '投稿を検索',
  'search.dialogHint': 'キーワードを入力して投稿を検索します',
  'search.dialogClose': '閉じる',
  'search.dialogSelect': '選択',
  'search.dialogOpen': '開く',
  'search.modeKeyword': 'キーワード',
  'search.modeSemantic': '意味検索',
  'search.semanticPlaceholder': '探したい内容を自然言語で入力、例：「中国本土で安定して ChatGPT を使う方法」',
  'search.semanticEmpty': '意味的に関連する記事が見つかりませんでした',

  // ── 友達 ─────────────────────────────────────────────────
  'friends.title': '友達',
  'friends.applyTitle': '友達のリンクに適用',
  'friends.siteName': 'サイト名',
  'friends.siteUrl': 'サイトのURL',
  'friends.ownerName': '名前',
  'friends.siteDesc': '説明',
  'friends.avatarUrl': 'アバターのURL',
  'friends.themeColor': 'テーマの色',
  'friends.submit': '送信',
  'friends.copySuccess': 'クリップボードにコピーしました',
  'friends.copyFail': 'コピーに失敗、手動でコピーしてください',
  'friends.generateFormat': 'フォーマットを生成',
  'friends.copyFormat': 'フォーマットをコピー',
  'friends.sitePlaceholder': 'マイブログ',
  'friends.ownerPlaceholder': 'あなたの名前',
  'friends.urlPlaceholder': 'https://your-site.com',
  'friends.descPlaceholder': '簡単な説明...',
  'friends.imagePlaceholder': 'https://...',
  'friends.previewTitle': '構成のプレビュー',
  'friends.copyConfig': '構成をコピー',
  'friends.copiedConfig': 'コピーしました!',
  'friends.hint': '説明: 上記のコードをコピーして、下のコメントセクションに貼り付けてください。',

  // ── コードブロック ──────────────────────────────────────────────
  'code.copy': 'コードをコピー',
  'code.copied': 'コピーしました!',
  'code.fullscreen': 'フルスクリーン',
  'code.exitFullscreen': 'フルスクリーンを終了',
  'code.wrapLines': '文字の折り返し',
  'code.viewSource': 'ソースを表示',
  'code.viewRendered': 'レンダリングされた表示',

  // ── 図表 / インフォグラフィック ───────────────────────────────────
  'diagram.fullscreen': 'フルスクリーン',
  'diagram.exitFullscreen': 'フルスクリーンを終了',
  'diagram.viewSource': 'ソースを表示',
  'diagram.zoomIn': '拡大',
  'diagram.zoomOut': '縮小',
  'diagram.resetZoom': 'リセット',
  'diagram.fitToScreen': '画面に合わせる',
  'diagram.download': '画像をダウンロード',

  // ── Lightboxでの画像表示 ──────────────────────────────────────────
  'image.zoomIn': '拡大',
  'image.zoomOut': '縮小',
  'image.resetZoom': 'リセット',
  'image.resetZoomRotate': '回転と拡大をリセット',
  'image.rotate': '90度に回転',
  'image.close': '閉じる',
  'image.prev': '前へ',
  'image.next': '次へ',
  'image.counter': '{current} / {total}',
  'image.hintDesktop': 'ダブルクリックで拡大、スクロール/ピンチで大きさを変更',
  'image.hintMobile': 'ダブルタップで拡大、ピンチで大きさを変更',

  // ── メディアコントロール ──────────────────────────────────────────
  'media.play': '再生',
  'media.pause': '一時停止',
  'media.mute': 'ミュート',
  'media.unmute': 'ミュートを解除',
  'media.fullscreen': 'フルスクリーン',
  'media.exitFullscreen': 'フルスクリーンを終了',
  'media.pictureInPicture': 'ピクチャーインピクチャー',
  'media.playbackSpeed': '再生速度',
  'media.download': 'ダウンロード',
  'media.prevTrack': '前のトラック',
  'media.nextTrack': '次のトラック',
  'media.volume': '音量: {percent}%',
  'media.progress': '再生の進捗',
  'media.playModeOrder': '順番',
  'media.playModeRandom': 'シャッフル',
  'media.playModeLoop': '1回のみリピート',

  // ── フッター ──────────────────────────────────────────────────
  'footer.poweredBy': 'Powered by {name}',
  'footer.totalPosts': '{count}件の投稿',
  'footer.totalWords': '{count}文字',
  'footer.totalWordsTitle': '合計の文字数',
  'footer.readingTimeTitle': '合計の読書時間',
  'footer.postCountTitle': '合計の投稿数',
  'footer.runningDays': '稼働して{days}日が経過',
  'footer.wordUnit': '文字',
  'footer.postUnit': '投稿',

  // ── Analytics Stats ─────────────────────────────────────────
  'stats.pageviews': 'アクセス数',

  // ── ページ付け ──────────────────────────────────────────────
  'pagination.prev': '前へ',
  'pagination.next': '次へ',
  'pagination.page': 'ページ: {page}',
  'pagination.currentPage': '現在は{page}ページです',
  'pagination.of': '{total}ページの内、',

  // ── パンくず ──────────────────────────────────────────────
  'breadcrumb.home': 'ホーム',
  'breadcrumb.goToCategory': '{name}のカテゴリーに移動',

  // ── フローティンググループ ──────────────────────────────────────────
  'floating.backToTop': 'トップに戻る',
  'floating.scrollToBottom': '下にスクロール',
  'floating.toggleTheme': 'テーマを切り替え',
  'floating.christmas': 'クリスマスエフェクトに切り替え',
  'floating.bgm': 'BGM',
  'floating.toggleToolbar': 'ツールバーを切り替え',

  // ── Chat ────────────────────────────────────────────────
  'chat.askArticle': 'この記事についてAIに聞く',
  'chat.scopedPrefix': '検討中: ',
  'chat.exitScope': '記事範囲を解除',

  // ── お知らせ ────────────────────────────────────────────
  'announcement.title': 'お知らせ',
  'announcement.new': '新着',
  'announcement.count': '{count}件のお知らせ',
  'announcement.unreadCount': '{count}件が未読',
  'announcement.markAllRead': 'すべて既読にする',
  'announcement.dismiss': '無視',
  'announcement.learnMore': '詳細を読む',
  'announcement.empty': 'お知らせは見つかりません',
  'announcement.emptyHint': '新しいお知らせはこちらに表示されます',

  // ── クイズ ────────────────────────────────────────────────────
  'quiz.check': 'チェック',
  'quiz.correct': '正解です!',
  'quiz.incorrect': '不正解、再度お試しください。',
  'quiz.incorrectAnswer': '不正解、答えは「{answer}」です。',
  'quiz.submitAnswer': '送信 ({count}個が選択済み)',
  'quiz.commonMistakes': 'よくある間違い:',
  'quiz.parseFailed': 'クイズの解析に失敗しました',
  'quiz.showAnswer': '答えを表示',
  'quiz.hideAnswer': '答えを隠す',
  'quiz.reset': 'リセット',
  'quiz.score': '得点: {score}/{total}',
  'quiz.completed': 'すべて完了しました!',
  'quiz.fillBlank': '回答を入力してください...',
  'quiz.selectOption': 'オプションを選択',
  'quiz.single': '単一で選択',
  'quiz.multi': '複数で選択',
  'quiz.trueFalse': '○か×か',
  'quiz.fill': '空欄を埋めてください',
  'quiz.optionTrue': '○',
  'quiz.optionFalse': '×',
  'quiz.clickToReveal': 'クリックで答えを表示',
  'quiz.quizOptions': '{type}個のオプション',
  'quiz.trueFalseCorrect': '正解です!',
  'quiz.trueFalseIncorrect': '不正解、答えは「{answer}」です。',

  // ── 暗号化されたブロック ─────────────────────────────────────────
  'encrypted.locked': '暗号化されたコンテンツ',
  'encrypted.placeholder': 'パスワードを入力でロックを解除',
  'encrypted.submit': 'ロックを解除',
  'encrypted.incorrect': 'パスワードが間違っています',

  // ── 暗号化された投稿 ─────────────────────────────────────────
  'encrypted.post.title': 'この記事は暗号化されています',
  'encrypted.post.description': 'パスワードを入力して内容をご覧ください',
  'encrypted.post.rssNotice': 'この記事は暗号化されています。ウェブサイトでご覧ください。',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'ページは見つかりません',
  'notFound.description': 'お探しのページは見つかりません',
  'notFound.backHome': 'ホームに戻る',
  'notFound.browseArchives': 'アーカイブを参照',
  'notFound.message': 'んにゃー? ページは食べられちゃったよ〜',

  // ── カテゴリーの統計 ────────────────────────────────────────
  'category.subCategoryCount': '{count}件のサブカテゴリー',
  'category.postCount': '{count}件の投稿',

  // ── 投稿カード ─────────────────────────────────────────────
  'post.readingTimeTooltip': '読み終える推定時間: {time}',

  // ── おすすめのシリーズ ─────────────────────────────────────────
  'series.latestPost': '最新',
  'series.viewAll': 'すべて表示',
  'series.postCount': '{count}件の投稿',
  'series.noPosts': 'このシリーズには投稿がありません',
  'series.rss': 'RSSフィード',
  'series.chromeExtension': 'Chrome拡張機能',
  'series.docs': 'ドキュメント',

  // ── ホーム情報 ───────────────────────────────────────────────
  'homeInfo.articles': '記事',
  'homeInfo.categories': 'カテゴリー',
  'homeInfo.tags': 'タグ',

  // ── ドロワー ──────────────────────────────────────────────────
  'drawer.navMenu': 'ナビゲーションメニュー',
  'drawer.close': 'メニューを閉じる',
  'drawer.openMenu': 'メニューを開く',

  // ── 概要パネル ───────────────────────────────────────────
  'summary.description': '概要',
  'summary.ai': 'AIの概要',
  'summary.auto': '概要',

  // ── ランダムな投稿 ────────────────────────────────────────────
  'post.randomPosts': '投稿をランダムに表示',

  // ── タグコンポーネント ───────────────────────────────────────────
  'tag.expandAll': 'すべて表示',
  'tag.viewTagPosts': '「{tag}」のタグの付いた投稿を{count}件表示',

  // ── オーディオプレーヤー ────────────────────────────────────────────
  'audio.loading': 'プレイリストを読み込み中...',
  'audio.loadError': '読み込みに失敗: {error}',
  'audio.retry': '再試行',
  'audio.empty': 'トラックが見つかりません',
  'audio.listTab': '{index}の一覧',
  'audio.closePanel': 'パネルを閉じる',

  // ── 目次のコンテンツ ───────────────────────────────────────
  'toc.title': '目次',
  'toc.expand': '目次のコンテンツを展開',
  'toc.empty': '見出しはありません',

  // ── 埋め込み ─────────────────────────────────────────────────
  'embed.loadingTweet': 'ポストを読み込み中',

  // ── 検索ショートカット ───────────────────────────────────────
  'search.searchShortcut': '検索 ({shortcut})',

  // ── Sider のセグメント ─────────────────────────────────────────
  'sider.overview': '概要',
  'sider.toc': 'コンテンツ',
  'sider.series': 'シリーズ',

  // ── リンクをコピー ───────────────────────────────────────────────
  'cover.copyLink': 'リンクをコピー',

  // ── コメント ────────────────────────────────────────────────
  'comment.prompt': '気に入ったならばコメントを残してくださいね～',
  'comment.loading': '読み込み中…',
  'comment.empty': 'まだコメントはありません。',
  'comment.anonymous': '匿名',
  'comment.placeholder': 'コメントを書いて…（画像は貼り付け可）',
  'comment.image': '画像',
  'comment.uploading': 'アップロード中…',
  'comment.submit': 'コメントする',
  'comment.posting': '投稿中…',
  'comment.emptyContent': 'コメントを入力してください',
  'comment.uploadFailed': '画像アップロード失敗',
  'comment.submitFailed': '投稿に失敗しました',
  'comment.poweredBy': 'Cloudflare KV + R2 で動作',

  // ── Bangumi (Bangumiは日本語で提供されてないのでざっくりとした内容にしています) ──────
  'bangumi.title': 'オタ活の記録',
  'bangumi.description': '私のメディアコレクションです',
  'bangumi.anime': 'アニメ',
  'bangumi.book': '書籍',
  'bangumi.music': '音楽',
  'bangumi.game': 'ゲーム',
  'bangumi.real': 'リアル',
  'bangumi.all': 'すべて',
  'bangumi.wish': '検討中',
  'bangumi.collected': '完了',
  'bangumi.watching': '視聴中',
  'bangumi.onHold': '保留中',
  'bangumi.dropped': '見逃した',
  'bangumi.noImage': '画像がありません',
  'bangumi.noItems': 'コレクションがありません',
  'bangumi.error': '読み込みに失敗しました。もう一度お試しください。',
  'bangumi.retry': '再試行',

  // ── Resources ──────────────────────────────────────────────
  'resources.title': 'リソース',
  'resources.description': 'ソフトウェア、AIツール、学習資料のクラウドドライブリンク集',
  'resources.intro': 'ログイン不要で閲覧できます。カードをクリックするとクラウドドライブのリンクが開きます。',
  'resources.searchPlaceholder': '名前・説明・カテゴリで検索…',
  'resources.clearFilters': 'フィルターをクリア',
  'resources.allCategories': 'すべて',
  'resources.resultCount': '{count} 件のリソース',
  'resources.download': '無料で取得',
  'resources.empty': '該当するリソースがありません',
  'resources.loading': '読み込み中…',
  'resources.error': 'リソースの読み込みに失敗しました。しばらくしてから再試行してください。',
  'resources.retry': '再試行',

  // ── Resource Card ───────────────────────────────────────────
  'resources.noCover': 'カバーなし',
  'resources.uncategorized': '未分類',

  // ── Christmas Toggle ────────────────────────────────────────
  'christmas.pullDownOff': '下にスワイプでオフ',
  'christmas.pullDownOn': '下にスワイプでオン',
  'christmas.turnOff': 'クリスマスモードをオフ',
  'christmas.turnOn': 'クリスマスモードをオン',

  // ── Menu Icon ───────────────────────────────────────────────
  'menu.close': 'メニューを閉じる',
  'menu.open': 'メニューを開く',

  // ── Progress Circle ─────────────────────────────────────────
  'post.readingProgress': '読書の進捗',

  // ── Quiz Option ─────────────────────────────────────────────
  'quiz.optionLabel': '選択肢 {letter}',

  // ── Temp Mail ──────────────────────────────────────────────
  'tempMail.title': '临时メール',
  'tempMail.domain': 'ドメイン',
  'tempMail.description': '登録用認証コードなどワンタイム用途の無料使い捨てメール。アドレスは24時間後に自動削除されます。',
  'tempMail.notConfigured': '临时メールのドメインがまだ設定されていません。サイトのバックエンドで設定してください。',
  'tempMail.intro': '下のボタンでランダムな临时アドレスを生成し、認証コードなどのワンタイムメールを受信します。アドレスは24時間後に削除されます。',
  'tempMail.generate': '临时アドレスを生成',
  'tempMail.generating': '生成中…',
  'tempMail.copy': 'コピー',
  'tempMail.copied': 'コピー済み',
  'tempMail.regenerate': '再生成',
  'tempMail.inbox': '受信箱',
  'tempMail.content': 'メッセージ',
  'tempMail.selectToView': '左のメッセージを選択して内容を表示',
  'tempMail.empty': 'メッセージはまだありません、受信待ち…',
  'tempMail.from': '送信者',
  'tempMail.subject': '件名',
  'tempMail.noSubject': '(件名なし)',
  'tempMail.refresh': '更新',
  'tempMail.autoRefresh': '自動更新',
  'tempMail.autoRefreshOn': '自動更新：オン',
  'tempMail.autoRefreshOff': '自動更新：オフ',
  'tempMail.lastChecked': '最終確認：{time}',
  'tempMail.verifyWait': '認証を実行中です。少し待ってから再度お試しください…',
  'tempMail.expiresHint': '注意：一部のサイト（特に国内プラットフォームや金融系）は使い捨てメールドメインをブロックします。このサービスは正規のワンタイム用途のみにご利用ください。',
};
