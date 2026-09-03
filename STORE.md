# Chromeウェブストア 提出用メモ

公開作業のときにこのファイルを見ながら入力してください。
**このファイルは拡張機能の動作には関係ありません**（同梱したままでも害はありませんが、
ZIPを作る際に除外しても構いません）。

---

## 1. 基本情報

| 項目 | 内容 |
|---|---|
| 拡張機能名 | スーパー動画再生早丸君 |
| バージョン | 1.0.0 |
| 発行者名（Offered by） | UR_Ikko |
| カテゴリ | ツール（Tools） |
| 言語 | 日本語 |
| 価格 | 無料 |
| **Trader申告** | **Non-Trader（非事業者）** |
| **プライバシーポリシーURL** | `https://saitoikko.github.io/hayamaru-kun/privacy.html` |
| ホームページURL | `https://github.com/saitoikko/hayamaru-kun` |
| サポートURL | `https://github.com/saitoikko/hayamaru-kun/issues` |

> Non-Trader を選ぶと、氏名・住所・電話番号は公開されません。
> 事業として提供する場合は Trader となり、これらが掲載ページ下部に公開されます。

---

## 2. 説明文

### 短い説明（132文字以内 / 現在62文字）

```
動画の再生速度をスライダーとキーで操作。YouTubeのプレイリスト単位で除外を登録でき、音楽リストだけ等倍にできます。外部通信なし。
```

### 詳細な説明

```
動画の再生速度を、スライダー・プリセットボタン・キーボードで自由に操作できます。

■ このツールの特徴：プレイリスト単位の除外

「普段は1.8倍で見たいが、音楽のプレイリストだけは等倍で聴きたい」
そのために動画1本ごとに速度を戻すのは手間です。

このツールなら、除外したいプレイリストを再生中にアイコンを押して
チェックを入れるだけ。以降そのプレイリストを再生している間は、
指定した速度（既定は等倍）が自動で適用されます。登録は1回きりです。

除外中のプレイリストは一覧で確認でき、名前の変更も解除もワンクリックです。

■ 速度の決め方（上が優先）

  1. この動画だけの設定
  2. 除外プレイリスト
  3. プレイリストごとの設定
  4. サイトごとの設定
  5. 全体の既定

サイトごと、プレイリストごと、動画ごとに別々の速度を覚えさせられます。

■ 操作方法

  ・ツールバーのアイコン → スライダー、プリセット、±ボタン
  ・キーボード
      D 速度を上げる（+0.25）
      S 速度を下げる（-0.25）
      R 等倍に戻す
      Z 10秒戻す
      X 10秒進める

  入力欄にカーソルがある間と、日本語入力の変換中はキーが反応しないので、
  検索窓に文字を打っていて誤って速度が変わる心配はありません。

■ その他

  ・0.25倍～16倍（4倍を超えるとブラウザの仕様で音声は出ません）
  ・iframe内の埋め込み動画にも対応
  ・全画面表示中も倍率が画面左上に表示されます
  ・アイコンに現在の倍率を表示
  ・ダークモード対応

■ プライバシー

  通信を行うコードは1行も含まれていません。
  収集も送信も共有も一切ありません。設定はあなたのパソコンの中だけに
  保存されます。ソースコードはMITライセンスで公開しています。


--------------------------------------------------------------------

Set a playback speed once, and keep it — with per-playlist exceptions.

Control video playback speed with a slider, presets, or the keyboard.

■ What makes this different: per-playlist exclusion

  "I watch everything at 1.8x, but I want music playlists at normal
  speed." Doing that video by video is tedious.

  With this extension you open a playlist, click the toolbar icon, and
  tick one checkbox. From then on, every video in that playlist plays at
  the speed you chose (1.00x by default), automatically. You register it
  once.

  Excluded playlists are listed in the popup. Rename or remove them with
  a single click.

■ How the speed is decided (top wins)

  1. This video only
  2. Excluded playlist
  3. This playlist
  4. This site
  5. Global default

  Different speeds are remembered per site, per playlist and per video.

■ Controls

  - Toolbar popup: slider (logarithmic), presets, fine +/- buttons
  - Keyboard
      D  faster (+0.25)
      S  slower (-0.25)
      R  reset to 1.0x
      Z  back 10 seconds
      X  forward 10 seconds

  Keys are ignored while you are typing in a text field, and while an
  IME composition is active, so you will never change the speed by
  accident while searching or commenting.

■ Other

  - 0.25x to 16x (browsers mute audio above 4x)
  - Works in embedded iframes
  - Speed is shown briefly in the top-left corner, including fullscreen
  - The toolbar badge shows the current rate
  - Follows your light / dark theme

■ Privacy

  This extension contains no networking code at all. Nothing is
  collected, sent or shared. Your settings are stored only on your own
  computer. The full source is published under the MIT license.
```

> 上の詳細説明は「日本語 → 区切り線 → 英語」の順に1つの欄へまとめて貼ります。
> 参考にした既存拡張（Video Speed Controller Global）と同じ形式です。

---

## 3. 単一用途の説明（Single purpose）

```
ウェブページ上の動画の再生速度を操作することが唯一の用途です。
利用者が設定した速度を、全体・サイト単位・プレイリスト単位・動画単位で
記憶し、該当するページで適用します。他の機能はありません。
```

---

## 4. 権限の理由（そのまま貼れます）

### `storage`

```
利用者が設定した再生速度と、除外するプレイリストの一覧を保存するために
使用します。保存先は利用者のパソコン内（chrome.storage.local）のみで、
同期も外部送信も行いません。
```

### `activeTab`

```
ツールバーのアイコンが押された瞬間だけ、開いているタブのURLを読み取り、
プレイリストID（listパラメータ）と動画ID（vパラメータ）を取り出すために
使用します。この2つが分からないと、どのプレイリストに対する設定なのかを
画面に表示できません。アイコンを押していない間は使用しません。
```

### ホスト権限（すべてのサイトでの実行）

```
動画はあらゆるウェブサイトに存在するため、特定のドメインに限定すると
利用者が見る動画の多くで機能しません。

ページ内で行う処理は次の3つだけです。
  1. <video> 要素の再生速度（playbackRate）の読み取りと書き込み
  2. 現在のURLからプレイリストIDと動画IDを読み取ること
  3. 倍率を知らせる小さな表示を画面左上に出すこと

ページの本文、フォームの入力内容、Cookie、認証情報の読み取りは行っておらず、
通信を行うコードも含まれていません。ソースコードで確認できます。
```

---

## 5. データ利用の申告（プライバシー慣行タブ）

以下のすべてに「収集しない」を選択します。

| 区分 | 申告 |
|---|---|
| 個人を特定できる情報 | 収集しない |
| 健康情報 | 収集しない |
| 財務情報・支払い情報 | 収集しない |
| 認証情報 | 収集しない |
| 個人的な通信内容 | 収集しない |
| 位置情報 | 収集しない |
| ウェブ閲覧履歴 | 収集しない |
| ユーザーの操作（クリック等） | 収集しない |
| ウェブサイトのコンテンツ | 収集しない |

3つの証明（すべてチェック）

- 承認された用途以外にデータを使用または転送しない
- 信用調査や融資目的でデータを使用または転送しない
- 第三者に販売しない

**プライバシーポリシーURL**（設置済み）

```
https://saitoikko.github.io/hayamaru-kun/privacy.html
```

GitHub Pages（`main` ブランチの `/docs` フォルダ）で公開しています。
本文を直すときは `docs/privacy.html` を編集して push すれば自動で反映されます。

---

## 6. 提出前チェックリスト

- [x] `icons/` に 16 / 32 / 48 / 128 px の PNG を配置し、manifest.json に `icons` を追記した
- [ ] スクリーンショットを1枚以上用意した（1280×800 または 640×400）
- [x] プライバシーポリシーをウェブ上に公開し、URLを控えた
- [ ] `STORE.md` を除いたフォルダをZIPにした
      （ZIPの直下に manifest.json が来るようにすること。フォルダごと圧縮しない）
- [ ] Chromeウェブストアのデベロッパー登録を済ませた
      ※ 登録メールは後から変更できません。専用のものを使うこと
- [ ] Trader / Non-Trader の申告で **Non-Trader** を選んだ

---

## 7. 審査について

公式ドキュメントによると、審査が長引く要因は
「新規開発者」「新規の拡張機能」「強い権限の要求」「大きなコード変更」です。
今回は前の3つに該当するため、**数日～数週間**を見込んでください。

3週間を超えても連絡がない場合は、サポートに問い合わせることが推奨されています。
