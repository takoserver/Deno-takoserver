// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $api_oumu from "./routes/api/oumu.ts";
import * as $api_tako from "./routes/api/tako.ts";
import * as $api_token from "./routes/api/token.ts";
import * as $button from "./routes/button.tsx";
import * as $greet_name_ from "./routes/greet/[name].tsx";
import * as $index from "./routes/index.tsx";
import * as $privacypolicy from "./routes/privacypolicy.tsx";
import * as $register from "./routes/register.tsx";
import * as $sns from "./routes/sns.tsx";
import * as $tako from "./routes/tako.jsx";
import * as $test from "./routes/test.tsx";
import * as $test_post from "./routes/test_post.tsx";
import * as $tests_UnderMenu from "./routes/tests/UnderMenu.tsx";
import * as $tests_form from "./routes/tests/form.tsx";
import * as $tests_post_reception from "./routes/tests/post-reception.tsx";
import * as $tests_post_send from "./routes/tests/post-send.tsx";
import * as $Button from "./islands/Button.tsx";
import * as $Counter from "./islands/Counter.tsx";
import * as $Fuka from "./islands/Fuka.tsx";
import * as $HeaderMenu from "./islands/HeaderMenu.tsx";
import * as $RegisterForm from "./islands/RegisterForm.tsx";
import * as $Test from "./islands/Test.tsx";
import * as $header from "./islands/header.tsx";
import { type Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/api/oumu.ts": $api_oumu,
    "./routes/api/tako.ts": $api_tako,
    "./routes/api/token.ts": $api_token,
    "./routes/button.tsx": $button,
    "./routes/greet/[name].tsx": $greet_name_,
    "./routes/index.tsx": $index,
    "./routes/privacypolicy.tsx": $privacypolicy,
    "./routes/register.tsx": $register,
    "./routes/sns.tsx": $sns,
    "./routes/tako.jsx": $tako,
    "./routes/test.tsx": $test,
    "./routes/test_post.tsx": $test_post,
    "./routes/tests/UnderMenu.tsx": $tests_UnderMenu,
    "./routes/tests/form.tsx": $tests_form,
    "./routes/tests/post-reception.tsx": $tests_post_reception,
    "./routes/tests/post-send.tsx": $tests_post_send,
  },
  islands: {
    "./islands/Button.tsx": $Button,
    "./islands/Counter.tsx": $Counter,
    "./islands/Fuka.tsx": $Fuka,
    "./islands/HeaderMenu.tsx": $HeaderMenu,
    "./islands/RegisterForm.tsx": $RegisterForm,
    "./islands/Test.tsx": $Test,
    "./islands/header.tsx": $header,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
