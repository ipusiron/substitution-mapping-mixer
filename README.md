<!--
---
id: day105
slug: substitution-mapping-mixer

title: "Substitution Mapping Mixer"

subtitle_ja: "換字式暗号の手動解析ワークベンチ"
subtitle_en: "Manual substitution-cipher mapping workbench"

description_ja: "換字式暗号の置換表を手動で解析するためのWebツール。確定マッピングと候補マッピングを管理し、複数の仮説をブランチとして比較できます。"
description_en: "A web tool for manually analyzing substitution cipher mapping tables. Manage fixed and candidate mappings, and compare multiple hypotheses as branches."

category_ja:
  - 暗号解析
  - 換字式暗号
category_en:
  - Cryptanalysis
  - Substitution Cipher

difficulty: 2

tags:
  - substitution-cipher
  - monoalphabetic-substitution-cipher
  - cryptanalysis
  - manual-analysis
  - branching
  - ctf-support

repo_url: "https://github.com/ipusiron/substitution-mapping-mixer"
demo_url: "https://ipusiron.github.io/substitution-mapping-mixer/"

hub: true
---
-->

# Substitution Mapping Mixer - 換字式暗号の置換表の手動解析支援ツール

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/substitution-mapping-mixer?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/substitution-mapping-mixer?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/substitution-mapping-mixer)
![GitHub license](https://img.shields.io/github/license/ipusiron/substitution-mapping-mixer)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/substitution-mapping-mixer/)

**Day105 - 生成AIで作るセキュリティツール200**

**Substitution Mapping Mixer** は、換字式暗号（単一換字暗号）の置換表を手動で解析するためのWebツールです。

暗号文文字から平文文字へのマッピングにおいて、確定と候補を管理し、複数の仮説をブランチとして比較できます。
比較の結果から、候補をさらに絞り込むことで、徐々に置換表を完成させられます。

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/substitution-mapping-mixer/](https://ipusiron.github.io/substitution-mapping-mixer/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

以下は実際の画面例です。

>![screenshot](assets/screenshot.png)
>
> *初期画面*

---

## ✨ 特徴

- **部分マッピングの管理**: 確定した対応と、まだ曖昧な候補を分けて管理
- **安全なブランチ生成**: 生成前に組合せ上限を計算し、最大200通りまでを比較可能
- **コンフリクト検出**: 同じ平文文字が複数の暗号文字に割り当てられた場合を視覚的に警告
- **候補のタップ操作**: 候補文字をボタンから確定または除外
- **分岐寄与の内訳**: 暗号文字ごとの実効候補数と、確定済みのため除外された文字を表示
- **対応表の保存・復元**: JSONまたはCSVで作業を引き継ぎ
- **相互ハイライト**: テキストとマッピング表の間でホバー連動
- **Semantic Ranking連携**: ブランチ結果を[Semantic Candidate Ranker](https://github.com/ipusiron/semantic-candidate-ranker)用フォーマットでエクスポート可能
- **日本語・英語表示**: 右上のボタンで画面表示を切り替え可能
- **完全クライアントサイド**: サーバー通信なし、データはブラウザー内のみ

---

## 📖 使い方

### 入力テキスト

- **A-Z（大文字）**: 暗号文文字（未デコード）
- **a-z（小文字）**: 確定済みの平文文字（ユーザーが直接入力）
- **その他**: そのまま保持

### 置換マッピング

各暗号文字（A-Z）に対して：

| 欄 | 説明 | 例 |
|----|------|-----|
| 確定 | 確定した平文文字（1文字） | `e` |
| 候補 | 可能性のある平文文字（複数可） | `aio` |

- 候補が1つの場合 → 自動的にその候補を採用
- 候補が2つ以上の場合 → すべての組み合わせでブランチを生成
- 同じ平文文字を二重に使う組み合わせ → 一対一制約により除外
- 生成前の組合せ上限が200通りを超える場合 → 生成を停止し、候補の絞り込みを案内
- 候補文字のボタン → その文字を確定し、同じ行の候補を消去
- 候補文字の横にある「×」 → その候補だけを除外

### 対応表の保存と読み込み

| 操作 | 保存内容 | 読み込み時の動作 |
|---|---|---|
| **JSON保存** | 入力テキストとA〜Zの対応表 | 入力テキストと対応表を復元 |
| **CSV保存** | A〜Zの対応表 | 対応表だけを復元し、入力テキストは維持 |
| **読み込む** | `.json`または`.csv` | 形式と全26行を検証してから一括反映 |

読み込み上限は128 KiBです。形式識別子、版番号、A〜Zの26行、小文字、候補の重複を検証し、不正なファイルでは現在の状態を変更しません。ファイルの内容はサーバーへ送信されません。

### ブランチ結果

- 各ブランチは候補の組み合わせを示すラベル付き
- ブランチ固有のマッピングはハイライト表示
- マッピングがない文字は大文字のまま表示
- 画面上の「生成前の組合せ上限」で、分岐量を確認可能
- 「分岐寄与の内訳」で、候補を減らしたときに上限がどれだけ下がるかを確認可能

> [!NOTE]
> 表示する件数は一対一制約に反する組み合わせを除外した後の値です。「生成前の組合せ上限」は安全判定用の上限値なので、実際のブランチ数より多い場合があります。

### エクスポート機能

ブランチ結果を[Semantic Candidate Ranker](https://github.com/ipusiron/semantic-candidate-ranker)で意味評価するためのフォーマットでエクスポートできます。

| ボタン | 機能 |
|--------|------|
| **Copy for Semantic Ranking** | クリップボードにコピー |
| **Download for Semantic Ranking** | `.txt`ファイルとしてダウンロード |

出力形式（1ブランチ = 1ブロック、空行区切り）:

```
branch=B1
mapping=Q->u
dear friend i do not know whether you are at the house

branch=B2
mapping=Q->o,X->r
dear friend i do not know whether you are at the house
```

- `branch=`: ブランチ識別子（トレース用）
- `mapping=`: そのブランチ固有の置換仮説のみ（共通部分は含まない）
- 3行目: 平文候補（意味評価の対象）

---

## 🔗 関連ツール

- **[Semantic Candidate Ranker](https://github.com/ipusiron/semantic-candidate-ranker)** - 意味評価による候補ランキングツール。
  - 本ツールのエクスポート機能で出力した候補を読み込み、Embeddingベースの意味評価でランキングできる。
- **[Frequency Analyzer](https://github.com/ipusiron/frequency-analyzer)** - 頻度分析ツール（Day009）。
  - 換字式暗号の解析前に、文字の出現頻度を調べる際に活用できる。

---

## 🎯 解読例

### 暗号解読ゲーム「Cypher」でSubstitution Mapping Mixerを利用する

- [MONOALPHABETIC SUBSTITUTION PUZZLE 03【Cypher編】](https://akademeia.info/?p=36107)

---

## 🎯 ユースケース

このツールならではの使い方は、単一換字暗号を解く途中で「ある暗号文字に複数の候補が残っている」状態をそのまま保持し、少数の仮説だけを見比べることです。たとえば、頻度分析で `Q → e` を確定し、`X → {a, o}`、`Z → {r, s}` と推定した場合、4通りの復号結果を同じ順序で確認できます。候補ボタンで`X → a`を確定すれば、対応表を直接書き直さずに2通りへ絞れます。

中断するときはJSONで入力テキストごと保存し、別の候補集合と比較したいときはCSVで対応表だけを交換できます。分岐寄与の内訳は、たとえば`A × 5`と`X × 2`が並んでいる場合、先にAの候補を減らすほうが上限を大きく下げられることを示します。

本ツールは自動解読器ではなく、表示された候補の自然さや正しさも判定しません。候補が多い場合は、頻度分析や文脈による推測で200通り以下へ絞り込んでから比較してください。

---

## 🖥️ 画面構成

- **入力テキスト**: 大文字を未解読の暗号文、小文字を確定済みの平文として入力
- **置換マッピング**: 各暗号文字の確定文字と候補文字を指定
- **保存・読み込み操作**: JSONは作業全体、CSVは対応表だけを保存・復元
- **未使用の平文文字**: 確定済みでも入力済みでもない文字を確認
- **分岐寄与の内訳**: 実効候補数と確定済み文字による除外を表示
- **ブランチ結果**: 一対一制約を満たす候補の組み合わせと復号結果を縦に表示
- **意味評価用エクスポート**: 最大200件の結果を外部ツール用のテキストとしてコピーまたは保存

---

## 📁 ディレクトリー構造

```
substitution-mapping-mixer/
├── index.html          # メインHTMLファイル
├── style.css           # スタイルシート
├── logic.js            # ブランチ計算・復号のコア処理
├── script.js           # 画面制御・日英表示
├── README.md           # 本ドキュメント
├── README.en.md        # 英語版ドキュメント
├── package.json        # テスト実行設定
├── test/               # Node.js標準テスト
├── .github/workflows/  # GitHub Actions
├── LICENSE             # ライセンスファイル
├── SPEC.md             # 機能仕様書
├── UI_SPEC.md          # UI仕様書
├── CLAUDE.md           # Claude Code用ガイド
├── .gitignore          # Git除外設定
├── .nojekyll           # GitHub Pages設定
└── assets/             # 画像リソース
    └── screenshot.png  # スクリーンショット
```

---

## 💻 動作環境

- 最新版の主要ブラウザー
- ローカル利用時は `index.html` を直接開いて実行可能
- テストはNode.js 22で `npm test` を実行（追加パッケージ不要）

---

## 📄 ライセンス

- ソースコードのライセンスは `LICENSE` ファイルを参照してください。

---

## 🛠️ このツールについて

本ツールは、「生成AIで作るセキュリティツール200」プロジェクトの一環として開発されました。
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。

🔗 [https://akademeia.info/?page_id=44607](https://akademeia.info/?page_id=44607)
