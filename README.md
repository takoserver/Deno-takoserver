※このソフトウェアを使用してサービスを提供する場合以下のライセンスに同意したと見なします
https://github.com/takoserver/takos/blob/main/LICENSE-takos
# 日本産オープンソース分散型チャットアプリ「tako's」
※takosだとタコスになっちゃうから'入れたのは内緒
## tako'sのコンセプト！
・LINEの無駄な機能を排除して本当に必要な機能のみ実装

・分散型だからユーザーの意見が反映されたサーバーに登録・移行が可能

・別のサーバー同士で友達になれる

・オープンチャットの代替サービスとして日本のネット文化の原点とも言える2chのような掲示板機能で不特定多数の人と交流することができます。

※現時点での目標であり、より良いサービスにするために増えたり減ったりします。

## 動かし方

Denoをインストールした後以下のコマンドを実行
```
debo -A run takos.js make database
//↑は初回のみ
deno task start
```

