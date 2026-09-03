# プライバシーポリシー — スーパー動画再生早丸君

最終更新日: 2026年9月3日
提供者: UR_Ikko

## 結論

**この拡張機能は、いかなる情報も収集・送信・共有しません。**
通信を行うコードは1行も含まれていません。

---

## 1. 収集する情報

**ありません。**

開発者を含む第三者が、この拡張機能を通じて利用者の情報を受け取ることはありません。
アクセス解析、広告、クラッシュレポート、利用統計のたぐいも一切組み込んでいません。

## 2. 端末内に保存する情報

利用者の設定を保存するため、以下をブラウザの拡張機能ストレージ
（`chrome.storage.local`）に保存します。**保存先は利用者のパソコンの中だけ**です。

| 保存する内容 | 目的 |
|---|---|
| 既定の再生速度 | 全体に適用する速度を覚えるため |
| 利用者が設定したサイトのホスト名と速度 | サイトごとの速度を覚えるため |
| 利用者が設定した動画IDと速度 | 動画ごとの速度を覚えるため |
| 利用者が登録したプレイリストIDと速度・名前 | プレイリスト単位の除外を実現するため |
| 除外プレイリストで再生された動画のID | プレイリスト経由でない開き方でも除外を効かせるため |
| 直前に見ていたページのホスト名・動画ID・プレイリストID | ポップアップに現在の対象を表示するため |
| 拡張機能の有効／無効の状態 | 利用者の選択を覚えるため |

これらはすべて **利用者自身が設定した内容と、その設定を適用するために必要な最小限の識別子**です。
閲覧したページのURL全体、ページの内容、検索語、入力内容、Cookie、認証情報は
**一切読み取っていませんし、保存もしていません**。

Chromeの同期機能は使用していません（`chrome.storage.sync` を使っていないため）。
保存された内容が他の端末やネットワーク上に出ることはありません。

## 3. 情報の送信・第三者提供

**行いません。**

- 外部サーバーへの送信はありません
- 第三者への提供・販売はありません
- 広告目的の利用はありません
- 開発者が利用者のデータを閲覧する手段はありません

## 4. 権限を要求する理由

| 権限 | 理由 |
|---|---|
| `storage` | 上記の設定を利用者のパソコンに保存するため |
| `activeTab` | ツールバーのアイコンが押された瞬間だけ、開いているタブのURLを読み、プレイリストIDと動画IDを取り出すため。押していない間は使用しません |
| すべてのサイトでの実行 | 動画はあらゆるサイトに存在するため。ページ内では `<video>` 要素の再生速度の読み書きと、URLのプレイリストID・動画IDの読み取りのみを行います |

## 5. 保存した情報の削除方法

- 拡張機能のポップアップ下部にある「全設定を初期化」を押す
- または `chrome://extensions` からこの拡張機能を削除する

いずれの場合も、保存された内容は完全に消去されます。

## 6. ソースコード

この拡張機能は MIT ライセンスで公開しています。上記の内容は
すべてソースコードで確認できます。

## 7. 本ポリシーの変更

変更する場合は、この文書の最終更新日を改めたうえで公開します。

## 8. 連絡先

X: @UR_Ikko

---

# Privacy Policy — スーパー動画再生早丸君 (Super Video Speed)

Last updated: September 3, 2026
Provider: UR_Ikko

**This extension does not collect, transmit, or share any information.**
It contains no networking code whatsoever.

## Data stored on your device

To remember your settings, the extension stores the following in
`chrome.storage.local`, which never leaves your computer:

- Your default playback rate
- Host names and rates you configured
- Video IDs and rates you configured
- Playlist IDs, rates and names you registered for exclusion
- Video IDs seen while an excluded playlist was playing (so exclusion still
  works when a video is opened outside the playlist)
- Host name, video ID and playlist ID of the page you last viewed, used to
  show the current target in the popup
- Whether the extension is enabled

Full page URLs, page content, search terms, keystrokes, cookies and
credentials are never read or stored. Chrome sync is not used.

## Permissions

- `storage` — save the settings listed above locally
- `activeTab` — read the URL of the current tab only at the moment you click
  the toolbar icon, to extract the playlist ID and video ID
- Access to all sites — videos exist on any site. On a page the extension only
  reads and writes the playback rate of `<video>` elements and reads the
  playlist/video ID from the URL

## Deleting your data

Use "全設定を初期化" in the popup, or remove the extension from
`chrome://extensions`. Either action erases everything stored.

## Contact

X: @UR_Ikko
