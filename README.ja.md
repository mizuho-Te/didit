# didit

**「テストが通った」。通すために、何が変わった？**

Git の差分から、テストのスキップ、判定条件の緩和、エラー抑制、設定の緩和を見つけるローカルCLIです。作者の意図を決めつけず、人が確認する箇所を示します。

[English](README.md)

![意図的に作ったデモでの didit の実行結果](examples/demo/demo.gif)

デモは実体験ではなく、説明用に作った例です。小さな Node テストハーネスが実際にアサーションを実行し、Vitest 形式の集計を出力します。[デモのファイル](examples/demo)も確認できます。

## ローカルプレビューを試す

**npm 未公開のプレビュー**です。パッケージ名の所有権は未確認なので、レジストリから `npx didit` を取得しないでください。別のパッケージを実行する可能性があります。Node.js 20 以上、Git 2.30 以上が必要です。

信頼できるチェックアウトで実行します。

```sh
npm ci
npm run build
node dist/cli.js --help
node dist/cli.js
npm pack
```

別の Git リポジトリでは、生成されたローカル tarball のパスを指定してインストールします。

```sh
npm install --save-dev /absolute/path/to/didit-0.2.0.tgz
npx --no-install didit
```

依存関係のインストールは通信する場合があります。検査自体は通信しません。`npx didit` は信頼できるローカルパッケージが既にある場合、または将来、公開先を確認した後の短縮形です。現段階では `--no-install` を付けてください。

### 使い方

```sh
npx --no-install didit --staged
npx --no-install didit --base main
npx --no-install didit --base main --head HEAD
npx --no-install didit --format json
npx --no-install didit --format markdown
npx --no-install didit --run "npm test"
npx --no-install didit --run "npm test" --junit "reports/*.xml"
npx --no-install didit --handoff --goal "割引計算を修正する" --lang ja
npx --no-install didit rules
```

既定では HEAD と作業ツリーを比較し、未追跡ファイルも含めます（Git の無視対象は除外）。`--base` は共通祖先を基準にし、`--head` 単独なら指定コミットとその親を比較します。`--staged` はインデックスを検査し、`--head` と併用できません。初回コミット前は空ツリーを基準にします。

終了コードは 0 がしきい値以上の未解除指摘なし、1 が指摘あり、2 が実行・指定エラーです。既定のしきい値は high。`--fail-on medium|low|none` で変更できます。0 は正しさの保証ではありません。ルール単位の失敗は標準エラーへの警告も確認してください。

JSON は `schemaVersion: 1` で、[スキーマ](schema/report.schema.json)を同梱します。`--handoff` は `.didit/handoff.md` と `.didit/handoff.json` を作り、実行していないテストは未実行と記載します。「関連するテスト変更なし」はファイル名による推定です。

## 検出できるもの

| 分類               | 確認する変更                                           |
| ------------------ | ------------------------------------------------------ |
| テスト無効化       | TS/JS の skip・todo・only、Python の skip・失敗許容    |
| 検証の削除         | テストファイル削除、テスト宣言数・アサーション数の減少 |
| 判定の緩和         | 等価比較から存在・真偽の確認へ                         |
| 期待値変更         | 期待値、スナップショットの変更                         |
| 抑制               | TS 指令、any、Lint 無効化、Python の型・Lint 抑制      |
| 設定緩和           | TypeScript、テストコマンド、カバレッジ基準             |
| CI 緩和            | 検査の無効化、失敗無視、削除                           |
| エラー握りつぶし   | 空 catch、Python の except/pass                        |
| テスト時だけの分岐 | 製品コードでのテスト環境判定                           |
| didit 設定         | `.didit.json` の追加・変更・削除                       |
| 実行結果           | 失敗・時間切れ、総テスト数減少、スキップ増加           |

差分ルール20件、実行ルール3件です。[詳細](docs/RULES.md)と[説明用の23例](docs/cheats.md)を参照してください。完全な構文解析ではなく、文字列と差分のヒューリスティックです。移動、複雑な構文、生成物、コメント、パラメーター化テストなどには誤検出・見逃しがあり得ます。バイナリ、大きすぎるファイル、既定の除外対象は全文検査しません。

## AIエージェント連携

信頼できるローカルパッケージを入れてから、使う連携を選びます。

```sh
npx --no-install didit init
npx --no-install didit init claude
npx --no-install didit init agents --lang ja
npx --no-install didit init cursor --lang ja
npx --no-install didit init copilot --lang ja
```

単独の `init` は `.didit.json` を未作成の場合だけ作り、`.gitignore` に `.didit/` を追加します。各連携は `.claude/settings.json`、`AGENTS.md`、`.cursor/rules/didit.mdc`、`.github/copilot-instructions.md` に設定・指示を追加します。無関係な内容を保持し、マーカー付き指示は繰り返しても重複しません。

生成される指示・引き継ぎ案内・Claude Stop フックは `npx --no-install didit` を使います（フックには `hook claude` が続きます）。先に対象リポジトリへ信頼できるローカルパッケージをインストールしてください。未導入のパッケージを取得する動作には切り替えません。繰り返し初期化しても重複しません。有効にする前に生成された設定を確認してください。

Claude Stop フックは標準入力の JSON を読み、問題なし／`stop_hook_active: true` なら 0、しきい値以上の指摘があれば標準エラーに出して 2、内部エラーなら 1 を返します。通常検査とは終了コードが異なります。設定に `run` があるとフックでも実行します。ローカルのプロトコルテストと実際のエージェント製品上の動作確認は別です。

## 設定

`.didit.json` はコメント付き JSONC に対応します。CLI が設定より優先され、言語は CLI → `DIDIT_LANG` → 設定 → ロケールの順です。

```json
{
  "failOn": "high",
  "lang": "ja",
  "exclude": ["**/fixtures/**"],
  "testFilePatterns": ["checks/**/*.ts"],
  "rules": { "any-added": "low" },
  "maxFileSizeKb": 1024,
  "timeoutSec": 600,
  "baseRun": {
    "enabled": true,
    "linkDirs": ["node_modules", ".venv", "venv"],
    "setup": null
  }
}
```

`"run": "npm test"` を追加すると、フックを含む検査時にそのコマンドを実行します。信頼できる場合だけ設定してください。`--no-base-run` は基準側の実行を省略します。[全設定と既定の除外](docs/SPEC.md)も参照してください。

## 意図した変更を解除する

同じ行か直前の行に、理由を書きます。

```ts
// didit-ok(test-skip-added): Requires a device unavailable in this test environment
it.skip('physical device handshake', () => {});
```

`// didit-ok: 理由`、`/* didit-ok: 理由 */`、Python の `# didit-ok: 理由` も使えます。理由なしは解除しません。ファイル単位・削除系の指摘は、残るファイルにルール指定コメントが必要です。削除済みファイルには設定の ignore を使います。

```json
{
  "ignore": [
    {
      "rule": "test-file-deleted",
      "path": "tests/legacy/**",
      "reason": "旧APIの廃止。代替の検証は別途レビュー済み"
    }
  ]
}
```

新しく追加した解除コメントは一覧に残ります。`.didit.json` 変更の指摘は無効化・解除できません。

## pre-commit

[フック定義](.pre-commit-hooks.yaml)は `entry: didit --staged`、`language: node`、`pass_filenames: false` です。公開先URL・リビジョンは未確定なので、リモート設定は公開前に確認してください。ローカルパッケージを入れたプレビューでは次の設定を使えます（pre-commit 本体は別途必要）。

```yaml
repos:
  - repo: local
    hooks:
      - id: didit
        name: didit
        language: system
        entry: npx --no-install didit --staged
        pass_filenames: false
```

公開リポジトリ経由の Node フック導入は未検証です。

## FAQ

**ごまかしと決めつけるの？** いいえ。正当な skip、仕様変更、移行でも指摘は出ます。意図や正しさを断定せず、人が確認すべき変更を示します。人間が書いた差分にも同じように使えます。

**指摘なしならテスト成功？** いいえ。静的検査だけではテストは実行しません。集計できない出力は `parser: "none"` と実際の終了状態を記録し、件数を作りません。実行数比較には両側の件数と比較可能な環境が必要です。

**通信やデータ送信は？** 静的検査は LLM・テレメトリー・アカウント・通信を使いません。レポートはローカルに置き、一時スナップショットは後片付けします。ただしインストールやホスト型CIは別です。`--run` と `baseRun.setup` は利用者権限で動く任意コマンドで、通信やファイル変更が可能です。サンドボックスではないので設定も確認してください。

**実行環境は隔離される？** コミットには一時 worktree、ステージ済みと空ツリーには HEAD のない一時 Git リポジトリを使います。HEAD 必須のテストは失敗し得ます。既定の依存フォルダリンクは元の作業ツリーと共有され、コマンドが変更できます。基準側の `baseRun.setup` はリンクの代わりに実行します。完全な隔離・再現性は保証しません。

**互換性は確認済み？** [検証記録](docs/verification)を参照してください。Linux/macOS/Windows × Node 20/22 のCI設定はありますが、設定だけでは成功の証拠になりません。未記録のOS、実製品のフック、パッケージ所有権、独立環境での導入を確認済みと扱わないでください。速度も機種依存です。

## 貢献と公開準備

[貢献方法](CONTRIBUTING.md)、[ルール案](docs/rule-ideas.md)、[変更履歴](CHANGELOG.md)、[行動規範](CODE_OF_CONDUCT.md)、[セキュリティ方針](SECURITY.md)。非公開の連絡先は管理者による設定待ちです。公開用文章は下書きであり、投稿していません。公開前にリポジトリURL、npm名、ホスト型CI、連絡先、別環境での導入を確認してください。

## ライセンス

本体はユーザー指定の [MIT](LICENSE) です。[第三者のライセンス・帰属](THIRD_PARTY_NOTICES.md)は別途保持します。元の設計文書の Apache-2.0 表記は歴史的記述で、[D-011](docs/DECISIONS.md#d-011-adopt-mit-for-first-party-code)によって変更されています。
