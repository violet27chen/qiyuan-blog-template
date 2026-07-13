[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

# qiyuan-blog-template

> 🚀 **組み込み AI 質問付きの多機能 Astro ブログテンプレート** — RAG サイト内アシスタント、記事読み上げ、コメント、ネットディスク、短縮 URL、リソースストアを標準搭載。EdgeOne Makers へデプロイ、すぐに使える。

[![Demo](https://img.shields.io/badge/Demo-オンライン-blue?style=flat-square)](https://www.qiyuan.icu)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

[Astro](https://astro.build) をベースに深くカスタマイズした個人ブログ＆技術リソースサイトのテンプレート（[Koharu](https://github.com/koharu-org/koharu) テーマ派生）。ライブデモ: [https://www.qiyuan.icu](https://www.qiyuan.icu)。

## 機能のスクリーンショット

![qiyuan ブログ ホーム画面](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/home.jpg)

> 上のスクリーンショットは**デモサイト（qiyuan.icu、全オプション機能オン）**のホーム画面です：上部の Hero 動画エリア、著者カード、記事一覧、サイト内 AI アシスタントのフローティングウィジェット、ナビバーのリソース／ネットディスク／短縮 URL への入口など。テンプレートではこれらのオプション機能は既定でオフです。クローン後に必要に応じてオンにしてください。

| 音楽プレイリスト | 一時メール |
| --- | --- |
| ![音楽プレイリスト画面](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/music.png) | ![一時メール画面](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/tempmail.png) |

| ネットディスク | リソースストア |
| --- | --- |
| ![ネットディスク画面](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/netdisk.png) | ![リソースストア画面](https://cdn.jsdelivr.net/gh/violet27chen/qiyuan-blog-template@main/screenshots/resources.jpg) |

> このリポジトリ **`qiyuan-blog-template`** は**ブログテンプレート**です：GitHub リポジトリ画面上の **Use this template** をクリックすれば、自分専用のブログリポジトリをワンクリックで作成できます。その後 `config/site.yaml` を編集し、記事を追加し、環境変数を設定してデプロイします。デプロイは中国向けに親和性の高い **EdgeOne Makers** を推奨します（詳細は下の「テンプレートとして使う」を参照。リソースストアは独立したサブプロジェクトで、別途デプロイが必要です。「リソースストア構築手順」を参照）。

## 永久無料のご案内

**本テンプレートの全機能（コメント、サイト内 AI アシスタント、リソースストア、一時メール、記事読み上げ、短縮 URL、ネットディスクを含む）は、各提供サービスの無料枠の範囲内であれば永久に無料で利用でき、いかなる料金も強制されません。** 以下の表は各機能が依存する外部サービスとその現在の無料枠です（2026-07 時点で確認、最新は各ベンダーの公式サイトを参照）：

| 機能 | 依存サービス | 無料枠（現在） |
| --- | --- | --- |
| サイトホスティング ＋ 全 API（RAG／一時メール／コメント／アップロード／MCP／統計） | EdgeOne Makers | エッジ関数 300 万回/月、クラウド関数 100 万回/月、KV／Blob 各 1 GB、ビルド 500 回/月、カスタムドメイン 200 個、無料 SSL；サイト高速化のトラフィック／リクエストはキャンペーン期間中無制限（無料枠は動画／大容量ファイル配信の高速化を含まず。当サイトの動画とネットディスクファイルは R2 直接アップロードのため、この高速化枠を消費しない） |
| サイト内 AI アシスタント・ブログ記事ベクトルストア | Neon（Postgres + pgvector） | 永久無料：ストレージ 0.5 GB/プロジェクト、100 CU-時間/月、100 プロジェクト、5 GB エグレス/月（アイドル時は自動でゼロに縮小） |
| サイト内 AI アシスタント・リソースストアベクトルストア | Supabase | 永久無料：DB 500 MB、ファイルストレージ 1 GB、帯域 5 GB/月、MAU 5 万、API リクエスト無制限（7 日アイドルで停止） |
| サイト内 AI アシスタント・埋め込み／再ランク | SiliconFlow bge-m3 / bge-reranker | 永久無料、中国本土から直結、1000 RPM |
| サイト内 AI アシスタント・生成モデル | 智譜 GLM-4.7-Flash（優先フォールバック） | 永久無料（200K コンテキスト）；ModelScope Llama-3.3-70B は 1 日 2000 回無料；商湯 deepseek-v4-flash はパブリックベータで無料（5 時間ごとに数百回） |
| コメント保存 | Cloudflare KV | 読み込み 10 万/日、書き込み 1000/日、削除 1000/日、ストレージ 1 GB |
| コメント画像／記事読み上げ音声／ネットディスクオブジェクト | Cloudflare R2 | ストレージ 10 GB/月、Class A 操作 100 万、Class B 操作 1000 万/月、エグレス無料 |
| コメント画像／ネットディスク アップロード Worker | Cloudflare Workers | リクエスト 10 万/日 |
| 一時メール（受信／保存／認証） | Cloudflare D1 + Email Routing + Turnstile | D1 ストレージ 5 GB／読み込み 500 万行/日；Email Routing 無料；Turnstile 無制限無料 |
| 短縮 URL 保存 | Cloudflare KV | コメントと同一ネームスペースの枠を共有（キー接頭辞 `short:`） |

> **補足**：
> - **永久無料枠**（長期有効）：Neon、Supabase、Cloudflare（Workers/KV/R2/D1/Email Routing/Turnstile）、SiliconFlow 埋め込み／再ランク、智譜 GLM-4.7-Flash。
> - **現在期間限定無料／パブリックベータ**：EdgeOne Makers の高速化トラフィックはキャンペーン期間中；商湯 sensenova（deepseek-v4-flash）は無料パブリックベータで、ベータ終了とともに枠や方針が変わる可能性があります — ただしテンプレートには**複数生成プラットフォームのフォールバック**が組み込まれており（智譜 GLM-4.7-Flash は永久無料、ModelScope は 1 日 2000 回無料）、いずれかのプラットフォームが変動しても AI アシスタントは停止しません。
> - **記事読み上げ音声はローカルで事前生成**されます（Edge TTS、Microsoft の無料音声エンドポイント経由 — キー不要、費用なし）。生成後は Cloudflare R2 のストレージ枠のみを消費します。
> - 上記各枠の範囲内に利用が収まる限り、ブログ全体（全オプション機能含む）は**永久にゼロコストで稼働**します；無料枠を超えた場合のみ従量課金となります（Supabase の拡張、Cloudflare のリクエスト超過、Neon のコンピュートアップグレードなど）。

## 🚀 テンプレートとして使う

1. **`qiyuan-blog-template`** リポジトリ画面上で **Use this template → Create a new repository** をクリックし、新しいリポジトリ名を入力（任意）。
2. ローカルへ `git clone` し、`npm install`。
3. `.env.example` を `.env` にコピーし、各機能の環境変数を必要に応じて記入（空なら該当機能は自動オフ）。
4. `config/site.yaml` を編集：`site.title` / `url` / `avatar` / `social` を自分の情報に変更。
5. `src/content/blog/welcome.md` を削除し、自分の `.md` 記事を配置。
6. EdgeOne Makers（または他の Astro 互換プラットフォーム）へデプロイ。プラットフォームの環境変数に `.env` と同じキー値を設定。

## オプション機能は既定でオフ

テンプレートをそのまま使える清潔さを保つため、**以下のオプション機能はすべて既定でオフ**です。クローン後に必要に応じてオンにしてください：

| 機能 | 設定スイッチ | 既定値 | 有効化の方法 |
| --- | --- | --- | --- |
| コメント | `comment.provider` | `none`（オフ） | `giscus` / `waline` / `twikoo` / `custom` に変更し、各設定を記入 |
| サイト内 AI アシスタント（RAG） | `rag.enabled` | `false` | `true` にし、`SILICONFLOW_API_KEY` / `NEON_SERVERLESS_URL` 等を設定 |
| リソースストア | `resources.enabled` | `false` | `true` にし、`resource-site/` を別途デプロイ（「リソースストア構築手順」参照） |
| 一時メール | `tempMail.enabled` | `false` | `true` にし、Cloudflare で受信 Worker + D1 + Email Routing をデプロイ |
| 記事読み上げ | 記事 frontmatter の `audio: true` | 未設定ならオフ | 記事冒頭に `audio: true` を追加し、`SILICONFLOW_API_KEY` + R2 を設定 |
| ネットディスク | ナビ項目の `enabled` | `false` | ナビ項目を `enabled: true` にし、`/api/drive/*`（R2/S3 + KV）をデプロイ |
| 短縮 URL | ナビ項目の `enabled` | `false` | ナビ項目を `enabled: true` にし、`/api/shorten/*` をデプロイ |

> 補足：コメント／一時メール／記事読み上げは「依存ゼロまたは軽依存」で、設定すればすぐ使えます；サイト内 AI アシスタント／リソースストア／ネットディスク／短縮 URL はエッジ関数と外部サービス（Neon／Supabase／R2／Cloudflare）に依存し、デプロイプラットフォームでの環境変数設定が必要です。各機能の詳細設定は下の「機能ハイライト」および各 `docs/*.md` を参照。

## 🛠 開発ツール：右クリック スタイルエディタ（ローカル `astro dev` のみ）

ローカルで **`astro dev`** を実行中は、**右クリックでスタイルエディタが開くよう固定**（オン／オフの切り替え不要）です：ページの任意の場所を**右クリック**するだけでエディタが表示され、見ながら調整できます。パネルは**絵文字を使わず**、アイコンはすべてインライン SVG；調整可能なプロパティはすべて**中国語／日本語／英語**の 3 言語で表記されます。

- **要素**：右クリックした要素のインラインスタイルを編集（文字／背景の色、フォントサイズ、フォントウェイト、パディング、マージン、角丸、枠線、配置、行の高さ、不透明度）。
- **メディアをアップロードして置換**：要素パネル上部の「画像をアップロード／画像をアップロード／Upload image」ボタン（SVG アイコン）は **画像／GIF／動画** に対応：
  - **`<img>`**（ヒーロー画像、おすすめカテゴリ画像など）を右クリック → その `src` を直接置換；画像を包むコンテナを右クリックした場合は、内部の `<img>` を自動特定してまとめて置換します。
  - 背景画像を持つ要素（背景エリアなど）を右クリック → その `background-image` を置換；**動画**をアップロードすると、絶対配置の `<video>` オーバーレイを動的 background として注入します。
  - 内容は base64／blob として注入され、**リロードで元に戻ります**（開発中のデバッグ用、ディスクには書き込みません）。
- **テーマ変数**：現在の「ライト／ダーク」に応じてグローバル CSS 変数を編集（SVG の太陽／月アイコンで切り替え）。変数は**自然な言葉の説明**で表示され（例：「ページ背景／ページ背景／Page background」）、技術的な変数名は小さなコード注記としてのみ表示されます。変更は `<style>` に注入され `localStorage` に保存（リロード後も維持）；「CSS をコピー」で出力、「リセット」で既定に戻ります。
- パネルは**スクロールバーを表示しません**（非表示；テーマ変数エリアは 2 列グリッドで高さを圧縮）；パネル外の空白をクリックすると自動で閉じます；パネルの配色は**ブログのテーマ変数を使用**し、ライト／ダークに自動追従します。

> ⚠️ この機能は **`import.meta.env.DEV` の下でのみマウント**されます（`src/layouts/Layout.astro` で `{import.meta.env.DEV && <StyleEditor />}` で包まれ、`src/components/dev/StyleEditor.tsx` 内にもフォールバックのガードがあります）。`astro build` 時は自動的に tree-shake され、**本番出力には含まれず**、ライブ訪問者への影響はゼロです。

## セキュリティレスポンスヘッダ

両方のエッジ関数（`edge-functions/api/[[default]].js` と `resource-site/edge-functions/api/[[default]].js`）は、**すべての API レスポンス**にセキュリティヘッダを統一して注入します（`getCorsHeaders()` 経由で spread され、1 か所で全 JSON／ストリーミング／プロキシレスポンスをカバー）：

| ヘッダ | 値 |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN`（`DENY` ではない。ネットディスクのインラインpreview用の同一サイト `<iframe>` が遮断されないため） |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`（preload リストには未登録、`preload` なし） |

**静的アセット**（HTML／JS／CSS／フォント／画像）のセキュリティヘッダは、**EdgeOne コンソール → サイト高速化 → 設定 → HTTP レスポンスヘッダ（レスポンスヘッダの変更）** で、ファイル拡張子ごとに上記と同じヘッダを一括追加してください（CDN キャッシュ層で注入されるため、キャッシュされたアセットにもヘッダが付きます）。CSP はまだ有効化されていません（サイト内に AdSense とインラインスクリプトがあり、別途監査が必要なため）。

> **オプションの強化**：**EdgeOne コンソール → セキュリティ → レート制限**で、書き込み系 API に「クライアント IP が 60 秒以内に 1 回以上 → 429 で遮断」のルールを追加し、`POST /api/comment-image`、`POST /api/drive/upload-init`、`POST /api/temp-mail/address` をカバーして、悪用を防ぎます。EdgeOne はエッジで実際のクライアント IP（`EO-Connecting-IP`）を判定するため、CDN 集約による「全ユーザー誤爆」は起きません。

## 技術スタック

- **Astro 5**（SSG）＋ カスタムテーマ。中国語／English／日本語 の 3 言語対応（`[lang]/` ミラールート）。
- **デプロイプラットフォーム：EdgeOne Makers**（騰訊雲エッジ関数／クラウド関数）。サイト `qiyuan.icu` はエッジで稼働、全文検索は Pagefind を使用。
- **エッジランタイム**：
  - `edge-functions/api/[[default]].js` —— EdgeOne エッジ関数单体。RAG チャット、一時メール、コメント、アップロード、MCP、統計など全 API を担う。
  - `cloud-functions/` —— Makers クラウド関数（ブログ画像アップロード `api/images/upload` など）。
- **外部依存**：Neon（Postgres + pgvector、ブログ記事ベクトル）、Supabase（リソースストアベクトル）、SiliconFlow（bge-m3／bge-reranker 埋め込み・再ランク）、商湯 sensenova ＋ ModelScope ＋ 智譜（生成モデル）、Cloudflare（KV コメント保存 ＋ R2 コメント画像 ＋ 一時メール Worker/D1）。

## 機能ハイライト

- **ブログ記事**：Markdown/MDX、カバー画像、目次、Pagefind サイト内検索；言語ごとの切り替え対応。
- **サイト内 AI アシスタント（RAG）「この記事について AI に聞く」**：
  - 検索：ブログ記事（Neon + pgvector `rag_posts` コサイン類似度）＋ リソースストア（Supabase `products` **ハイブリッド検索**：ベクトル ＋ 語彙 `ilike`、RRF 融合）。各候補を再ランクしてからコンテキストへ。
  - 埋め込み `BAAI/bge-m3`、再ランク `BAAI/bge-reranker-v2-m3`（いずれも SiliconFlow 経由、無料）。
  - 生成：**優先は商湯 sensenova `deepseek-v4-flash`（複数キー順次切替、思考モードオフ）**。フォールバックは ModelScope／智譜 GLM／SiliconFlow DeepSeek。
  - **利用する生成 LLM プラットフォーム**：
    - **SiliconFlow**：埋め込み `BAAI/bge-m3` ＋ 再ランク `BAAI/bge-reranker-v2-m3`（無料）。最終フォールバックとして生成も（DeepSeek）。
    - **商湯 sensenova**：生成優先、モデル `deepseek-v4-flash`（複数キー順次切替、思考モードオフ）。
    - **ModelScope**：生成フォールバック、`Llama-3.3-70B`（中国本土から直結、無料）。
    - **智譜 GLM**：生成フォールバック、`GLM-4.7-Flash`（永久無料、中国本土から直結）。
  - パフォーマンス最適化：**Neon ウォームアップ**（リクエスト内で `SELECT 1` と埋め込みを並行、scale-to-zero のコールドスタート解消）、**質問ベクトルキャッシュ**（LRU 5 件、同一質問は重複埋め込みをスキップ）。
- **一時メール** `qiyuanmail.cc.cd`：Cloudflare Email Routing → Worker → D1（`temp_addresses` / `temp_messages`）；Turnstile 人間認証；フロントエンドは受信箱、自動更新、HTML メール描画（リンクは新規タブで開く）に対応。
  - ⚠️ 受信 Worker ＋ D1 ＋ Email Routing は **Cloudflare コンソール**で自分でデプロイが必要（コードは `cloudflare/`）。本リポジトリのエッジ関数は UI と読み取り／アドレス生成のみを担います。
- **コメントシステム**：コメントは **Cloudflare KV** に、画像は **Cloudflare R2** に保存（アップロード Worker 経由で直接書き込み、S3 キー不要）。`config/site.yaml` の `comment.provider` は既定 `none`（任意で `custom` / `giscus` / `waline` / `twikoo`）。
- **R2 独立画像ホスト**：コメント画像は `r2.qiyuan.icu` 経由（中国本土では EdgeOne エッジが Cloudflare へバックホールし、ブラウザは Tencent のネットワークのみを通過）。
- **記事読み上げ（Edge TTS 事前生成音声）**：記事 frontmatter に `audio: true` を加えると、中国語読み上げ mp3 を生成。流れ：**公開前にローカル**で Edge TTS 合成 → Cloudflare R2 へアップロード（`audio/<slug>.mp3`、`r2.qiyuan.icu` CDN 経由） → フロントエンドプレーヤーがクリックで再生（**実行時のリアルタイム合成ではなく**、より安定）。マニフェスト `src/assets/audio-manifest.json` が各 `slug → { url, voice, chars, bytes, generatedAt }` を記録、記事ページはこれに基づきプレーヤーを表示。
  - 音声 URL には自動でキャッシュ破壊パラメータ `?v=<mp3 内容 sha256 の先頭 12 文字>` が付きます：R2/EdgeOne は未知のクエリパラメータでも同一オブジェクトを返しますが、ブラウザ／CDN は完全 URL をキャッシュキーとするため、音声内容更新後は URL が必ず変わり再取得が強制され、古い mp3 が長期キャッシュされるのを防ぎます（R2 既定 `Cache-Control: max-age=604800`）。
  - 生成：`npm run generate:audio`（増分、内容＋音声ハッシュが一致すればスキップ）；`-- --force` で全量再生成；`-- --local` でローカル `public/audio/` へ強制出力。増分キャッシュは `.cache/audio-cache.json`。
- **短縮 URL（Short URL）**：長いリンクを `{origin}/api/s/<slug>` に短縮。Cloudflare KV に保存（コメントと同一ネームスペース、接頭辞 `short:`）；カスタム短縮コード（3–32 文字の英数字 `_-`）または自動 6 文字ランダムに対応；対象は `http/https` のみ受け付け；`/api/s/<slug>` へアクセスで元リンクへ 302 リダイレクト、存在しなければ 404。要 `CF_KV_*`。
- **公開ネットディスク（Netdisk）** `/drive`：ブラウザが S3 署名付き PUT で Cloudflare R2 へ直接アップロード；ファイルメタデータは Cloudflare KV に保存；単一ファイルの既定上限 500MB（`DRIVE_MAX_BYTES` で上書き可）。アップロード初期化 `/api/drive/upload-init`、完了コールバック `/api/drive/upload-complete`、一覧 `/api/drive/list`、共有ページメタデータ `/api/drive/meta/:token` を提供。**ファイルは 24 時間後に自動削除**（KV `expirationTtl`、`DRIVE_TTL_HOURS` で変更可）。実際にオブジェクトを消去するには Cloudflare コンソールの R2 バケット Lifecycle ルール（接頭辞 `drive/`）が必要。要 `R2_*` と `CF_KV_*`。

## ローカル開発

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ へビルド
npm run preview  # ビルド結果をプレビュー
```

> **Node.js 18.17.1+**（20+ 推奨）と npm 9+ が必要。

> RAG 関連スクリプト（任意、通常は CI/デプロイ時に自動実行）：`npm run index:neon`（記事ベクトル）、`npm run index:resources`（リソースベクトル回填）、`npm run generate:summaries` など。

> 記事読み上げ音声は**ローカルで事前生成**が必要です：`npm run generate:audio` で合成して R2 へアップロードした後、`src/assets/audio-manifest.json` をコミットしてください（デプロイはマニフェストのみ読み取り、音声は生成しません）。`audio: true` の記事を追加／編集した後は必ず本コマンドを再実行してください。

## 環境変数（EdgeOne コンソール）

エッジ関数は環境変数でシークレットを注入します。本リポジトリのコードは**いかなるシークレットも含みません**。

### RAG 必須

| 変数 | 説明 |
| --- | --- |
| `SILICONFLOW_API_KEY` | 埋め込み(bge-m3)/再ランク(bge-reranker)に必須；テキスト生成の最終フォールバックとしても使用 |
| `NEON_SERVERLESS_URL` | ブログ記事ベクトルストア `rag_posts`（pgvector）接続文字列、必須 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | リソースストアベクトルストア `products` 接続情報、必須 |

### 生成モデル（優先 ＋ フォールバック）

| 変数 | 説明 |
| --- | --- |
| `SENSENOVA_API_KEYS` | **生成優先**；複数キーはカンマ／改行で区切り、順次切り替え、すべて失敗で次プラットフォームへ；モデル固定 `deepseek-v4-flash`、思考モード強制オフ |
| `MODELSCOPE_API_KEY` | 任意フォールバック、ModelScope `Llama-3.3-70B`（中国本土から直結、無料） |
| `ZHIPU_API_KEY` | 任意フォールバック、智譜 `GLM-4.7-Flash`（永久無料、中国本土から直結） |

### コメント／R2 画像ホスト

| 変数 | 説明 |
| --- | --- |
| `CF_KV_NAMESPACE_ID` / `CF_KV_API_TOKEN` | Cloudflare KV（**コメント ＋ 短縮 URL**保存）、必須（未設定だとコメント／短縮 URL API が 503） |
| `CF_ACCOUNT_ID` | Cloudflare アカウント ID（R2／KV 共通、既定で既知、変更不要） |
| `UPLOAD_WORKER_URL` / `UPLOAD_WORKER_KEY` | アップロード Worker（R2 バインドでコメント画像を直接書き込み、S3 直接より優先） |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL` | 記事読み上げ**音声**と**ネットディスク**アップロード用 R2 の S3 クレデンシャル（コメント画像はアップロード Worker へ移行済みだが、音声とネットディスクは S3 直接のまま）；未設定なら音声はローカル `public/audio/` へ、ネットディスクは利用不可 |

### ネットディスク／短縮 URL

| 変数 | 説明 |
| --- | --- |
| `DRIVE_TTL_HOURS` | ネットディスクファイルの生存時間（時間）、既定 `24`；期限で KV `expirationTtl` が無効をマーク、実際の削除には R2 バケット Lifecycle ルール（接頭辞 `drive/`）が必要 |
| `DRIVE_MAX_BYTES` | ネットディスク単一ファイルサイズ上限（バイト）、既定 `524288000`（500MB） |

> 短縮 URL は上の `CF_KV_*` を共有；ネットディスクは上の `R2_*` と `CF_KV_*` を共有。

### 一時メール

| 変数 | 説明 |
| --- | --- |
| `TEMP_MAIL_D1_ID` | D1 データベース ID |
| `CF_D1_API_TOKEN` | D1 読み書きトークン（D1:Edit 権限含む） |
| `TURNSTILE_SECRET` | Turnstile シークレットキー（注意：サイトキーではない） |
| `TEMP_MAIL_DOMAIN` | 任意、既定 `qiyuanmail.cc.cd` |

### リソースストア（任意）

| 変数 | 説明 |
| --- | --- |
| `JWT_SECRET` | リソースストア ユーザーログイン JWT 署名キー（**必須**、未設定だと `/api/auth/*` がエラー） |
| `PUBLISH_KEY` | MCP 公開と画像アップロードキー（`/api/publish` と `/api/images/upload` の両方に使用）、任意 |
| `PUBLIC_BASE_URL` | 公開サイトのベース URL、例 `https://www.qiyuan.icu`、共有／SEO リンク生成用 |

> リソースストアは**独立してデプロイ**するプロジェクトです。ブログはそのデータを**参照**するだけです。詳細手順は下の「リソースストア構築手順」を参照。

## リソースストア構築手順

> ⚠️ **リソースストアとブログは独立した 2 つのデプロイです。混同しないでください：**
>
> - **リソースストア**（ネットディスク リソース共有サイト）：**別の EdgeOne プロジェクト**。ソースは本リポジトリの [`resource-site/`](./resource-site/) サブディレクトリにあり、独自のエッジ関数、Supabase データベース、（任意の）フロントエンドを持ち、**別途デプロイ**して独自のドメイン（例 `resources.qiyuan.icu`）を割り当てます。
> - **ブログ**：同一 Supabase データベースを共有 ＋ `RESOURCES_API_PROXY` をリソースストアのドメインに向けることでリソースデータを**参照**し、組み込みの「リソース」ページ（`/resources`）で表示・検索・ネットディスクリンク取得を行います。
>
> つまり：**まず `resource-site/` を独立プロジェクトとしてデプロイし、その後ブログからそれを指します。** 両者は同一 Supabase プロジェクトを共有しても、独立していても構いません。

### アーキテクチャ

```
                    ┌──────────────────── リソースストア（独立デプロイ、resource-site/）
ブラウザ               │   EdgeOne プロジェクト A（ドメイン例 resources.qiyuan.icu）
 ├─ リソースサイト ───┤     ├─ edge-functions/api/[[default]].js（認証/商品/コメント/画像/MCP）
 │                  │     └─ Supabase（users / products / reviews / orders；product-images バケット）
 │                  └────────────────────
 │
 └─ ブログ「リソース」ページ ──→ EdgeOne プロジェクト B（ブログ、リポジトリルート）
        /resources        └─ /api は RESOURCES_API_PROXY 経由でリソースストアを参照、または同一 Supabase へ直接読み取り
```

### 1. リソースストアをデプロイ（独立プロジェクト）

ソースは [`resource-site/`](./resource-site/)、詳細ドキュメントは [`resource-site/README.md`](./resource-site/README.md)。

1. **DB 作成と RLS**：Supabase SQL Editor で順に実行：
   - [`resource-site/database/schema.sql`](./resource-site/database/schema.sql)（テーブル：`users` / `products` / `reviews` / `orders` / `quark_orders`）
   - [`resource-site/database/rls_policies.sql`](./resource-site/database/rls_policies.sql)（RLS：`users` は anon に完全非公開、商品は匿名で上架時のみ読み取り可）
2. **Storage バケット作成**：`product-images` バケットを作成し公開設定（または `/api/images/*` でプロキシ）。
3. **`resource-site/` を別途デプロイ**：そのディレクトリを独立した EdgeOne プロジェクトとしてデプロイ（エッジ関数 ＋ 任意の静的フロントエンド）。コンソールで環境変数を設定：
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...      # サーバーサイドキー
   JWT_SECRET=***                    # リソースストア ログイン JWT 署名キー（必須）
   ```
   > フロントエンドページ（`public/*.html`）はテンプレートに同梱されていません；自身で作成するか元サイトから取得してください。API のみでよい場合はエッジ関数のみをデプロイしても構いません。

### 2. ブログからリソースストアを参照

1. **データ層**：ブログとリソースストアは**同一 Supabase を共有**。RAG 意味検索には Supabase で [`database/products_embedding.sql`](./database/products_embedding.sql) を実行し `products` にベクトル列を追加；多言語カテゴリは任意で [`database/resource_category_i18n.sql`](./database/resource_category_i18n.sql) を実行。
2. **設定で向き先を指定**：ブログ側で `RESOURCES_API_PROXY` をリソースストアのドメイン（例 `https://resources.qiyuan.icu`）に設定；ローカル `npm run dev` はこれに従い `/api` をプロキシ。
3. **リソースページを有効化**：`config/site.yaml` の `resources.enabled: true`（既定オン）、`label` / `icon` / `ownerUserId` を必要に応じて変更。
4. **ブログをデプロイ**：Git へプッシュ、EdgeOne Makers が自動ビルド＆公開。

### 検証

```bash
# リソースストアのドメインで検証
curl https://resources.your-domain.com/api/categories
curl "https://resources.your-domain.com/api/products?limit=2"
```

JSON が返ればリソースストアは正常動作。管理画面でアカウント登録と商品公開ができます（パスワードは大文字＋小文字＋数字＋記号をすべて含む必要があります）。

### その他のドキュメント

- [リソースストア独立デプロイ説明](./resource-site/README.md) と [デプロイガイド](./resource-site/docs/DEPLOYMENT.md)
- [リソースストア API](./resource-site/docs/API.md)
- [リソースストア データベース構造](./resource-site/docs/DATABASE.md)
- [ブログ側リソース参照設定（詳細）](./docs/resources-deployment.md)
- [AI リソース公開プロンプト](./docs/ai-resources-publisher-prompt.md)

## サイト設定

主な設定は `config/site.yaml`、よく使う項目：

| 設定項目 | 説明 |
| --- | --- |
| `site.title` / `site.subtitle` | サイトタイトルとサブタイトル |
| `site.name` / `site.author` | 著者名 |
| `site.avatar` | アバターのパス（現在 `/img/avatar.svg`、`.jpg`/`.webp` に変更可） |
| `site.url` | サイト URL、RSS と SEO 用 |
| `site.startYear` | サイト開設年 |
| `tempMail.domain` | 一時メールのドメイン（既定 `qiyuanmail.cc.cd`） |
| `turnstileSiteKey` | Turnstile サイトキー（公開、フロントエンドの認証ウィジェット描画用） |
| `comment.provider` | コメント提供元、既定 `none`（任意 `custom` / `giscus` / `waline` / `twikoo`） |

アバターの置き換え：`public/img/avatar.svg`（または同名 `.jpg`/`.webp`）に画像を置き、`public/favicon.ico` も同期更新（favicon はアバターから生成）。

## 記事の追加方法

1. `src/content/blog/` に新しい Markdown/MDX ファイルを作成、例 `my-post.md`。
2. ファイル冒頭に frontmatter を書く：

```md
---
title: 記事のタイトル
description: 一行の概要
pubDate: 2026-06-05
heroImage: ./cover.png   # 任意、カバーは同階層またはサブディレクトリ
categories:
  - ノート
tags:
  - タグ1
audio: true        # 任意：true でこの記事の Edge TTS 中国語読み上げ音声を生成（上の「記事読み上げ」参照）
---

本文をここに書く…
```

1. カバー画像の規則：
   - 記事と同じ階層：`heroImage: ./cover.png`
   - サブディレクトリ内：`heroImage: ./my-post/cover.png`
2. 保存後、ローカルで `npm run dev` でプレビュー、または `npm run build` でビルド。

> `pubDate` / `heroImage` は自動的に `date` / `cover` にマップされ、`src/content.config.ts` の schema と整合。

画像変更後は `npm run generate:lqips` を実行しプレースホルダーグラデーションを更新してください。

## ディレクトリ構成

| パス | 説明 |
| --- | --- |
| `config/site.yaml` | サイト主設定 |
| `src/pages/` | ページルート（`[lang]/` 多言語ミラー含む） |
| `src/content/blog/` | 記事コレクション（Markdown/MDX） |
| `src/components/` | UI コンポーネント（`tempmail/`、`chat/` 含む） |
| `src/layouts/` | ページレイアウト |
| `edge-functions/api/[[default]].js` | EdgeOne エッジ関数：RAG チャット／一時メール／コメント／アップロード／MCP／統計 |
| `cloud-functions/` | Makers クラウド関数（ブログ画像アップロード等） |
| `cloudflare/` | 一時メール受信 Worker、D1 schema、wrangler 設定（Cloudflare へ自前デプロイ） |
| `public/` | 静的アセット（favicon、画像、フォント等） |
| `scripts/generate-audio.mjs` | 記事読み上げ音声生成（Edge TTS → R2/CDN、`src/assets/audio-manifest.json` を出力） |
| `src/assets/audio-manifest.json` | 音声マニフェスト：`slug → { url, voice, chars, bytes, generatedAt }`、`url` は `?v=<ハッシュ>` のキャッシュ破壊付き |

## デプロイ

Git へプッシュ後、**EdgeOne Makers** が自動ビルド（`npm run build`）＆公開し、エッジ関数もリポジトリとともにデプロイされます。**デプロイ前に、EdgeOne コンソールで上記の環境変数を設定してください**（特に `SILICONFLOW_API_KEY` / `NEON_SERVERLESS_URL` / `SUPABASE_*` / `SENSENOVA_API_KEYS` / `CF_KV_*`）。

一時メール機能は別途 **Cloudflare コンソール**で： `cloudflare/` 配下の受信 Worker をデプロイ、D1 テーブルを作成、Email Routing catch-all → Worker を設定、Turnstile を設定。各ファイル内のコメントを参照。

## ライセンス

本プロジェクトは **MIT ライセンス** でオープンソースです（[LICENSE](./LICENSE) を参照）。自分のブログとしてフォーク・改変・デプロイが自由で、著作権とライセンス表示を保持すれば商用利用も可、自己責任で。
