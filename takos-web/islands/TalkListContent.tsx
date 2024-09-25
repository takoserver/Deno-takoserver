import User from "../components/User.tsx"
import { setIschoiseUser } from "../util/takosClient.ts"
import RequestFriendById from "./RequestFriendById.tsx"
import GetAddFriendKey from "./getAddFriendKey.tsx"
import FriendRequest from "./FriendRequest.tsx"
import { AppStateType } from "../util/types.ts"
import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { createTakosDB } from "../util/idbSchama.ts"
import {
  createRoomKey,
  decryptDataRoomKey,
  decryptDataWithAccountKey,
  EncryptedDataAccountKey,
  EncryptedDataRoomKey,
  encryptWithAccountKey,
  generateKeyHashHexJWK,
  type IdentityKeyPub,
  isValidAccountKey,
  isValidIdentityKeySign,
  isValidMasterKeyTimeStamp,
  MasterKeyPub,
  type RoomKey,
  Sign,
  signData,
  verifyData,
} from "@takos/takos-encrypt-ink"
import { saveToDbAllowKeys } from "../util/idbSchama.ts"
import { generate } from "$fresh/src/dev/manifest.ts"
function TalkListContent({ state }: { state: AppStateType }) {
  async function handleFriendRoomSetup(
    talk: { nickName: string; userName: string; roomID: string },
  ) {
    const { nickName, userName, roomID } = talk

    // Update state
    state.isChoiceUser.value = true
    state.roomName.value = nickName
    state.friendid.value = userName
    setIschoiseUser(true, state.isChoiceUser)
    state.roomType.value = "friend"

    // Fetch talk data
    const talkData = await fetch(`/takos/v2/client/talk/data/friend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userName,
      }),
    }).then((res) => res.json())
    console.log(talkData)
    // Process room keys
    const roomKeys = await Promise.all(
      talkData.keys.map(async (key: EncryptedDataAccountKey) => {
        const accountKey = state.IdentityKeyAndAccountKeys.value.find(
          (key2: { hashHex: string }) => {
            return key2.hashHex === key.encryptedKeyHashHex
          },
        )
        if (!accountKey) {
          return
        }
        const decryptedRoomKeyString = await decryptDataWithAccountKey(accountKey.accountKey, key)
        if (!decryptedRoomKeyString) {
          console.error("Failed to decrypt room key")
          return
        }
        return {
          userId: userName,
          roomid: roomID,
          roomKey: JSON.parse(decryptedRoomKeyString),
        }
      }),
    ).then((keys) => keys.filter(Boolean)) // Filter out undefined results
    console.log(roomKeys)
    // Generate room key hashes and filter valid ones
    if (roomKeys.length === 0) {
      console.log("roomKeys is empty")
      const latestIdentityAndAccountKeys = state.IdentityKeyAndAccountKeys.value[0]
      const keys = await fetch(
        `/takos/v2/client/users/keys?userId=${userName}`,
      ).then((res) => res.json())
      const userMasterKey: MasterKeyPub = keys.masterKey
      const db = await createTakosDB()
      const isRegioned = await db.get(
        "allowKeys",
        await generateKeyHashHexJWK(
          keys.masterKey,
        ),
      )
      if (!isRegioned) {
        const verifyMasterKeyValid = await isValidMasterKeyTimeStamp(
          userMasterKey,
        )
        if (!verifyMasterKeyValid) {
          alert("エラーが発生しました")
          return
        }
        const date = userMasterKey.timestamp
        const recognitionKey = JSON.stringify({
          userId: userName,
          keyHash: await generateKeyHashHexJWK(
            keys.masterKey,
          ),
          type: "recognition",
          timestamp: date,
        })
        const recognitionKeySign = await signData(
          latestIdentityAndAccountKeys.identityKey,
          recognitionKey,
        )
        const res = await fetch(
          "/takos/v2/client/keys/allowKey/recognition",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: recognitionKey,
              sign: recognitionKeySign,
            }),
          },
        )
        const data = await res.json()
        if (data.status === false) {
          alert("エラーが発生しました")
          return
        }
        await saveToDbAllowKeys(
          await generateKeyHashHexJWK(
            keys.masterKey,
          ),
          userName,
          "recognition",
          date,
        )
      }
      // 一つ次に新しいmasterKeyをidbから取得
      const allowedMasterKeys = await db.getAll(
        "allowKeys",
      )
      const userMasterKeys = allowedMasterKeys.filter(
        (data) => data.allowedUserId === userName,
      )
      const thisMasterKeyTimeString = (userMasterKeys.find(
        async (data) =>
          data.keyHash ===
            await generateKeyHashHexJWK(userMasterKey),
      ))?.timestamp
      if (!thisMasterKeyTimeString) {
        alert("エラーが発生しました")
        return
      }
      //新しい順にuserMasterKeysを並び替え
      userMasterKeys.sort((a, b) => {
        return new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      })
      //thisMasterKeyTimeのインデックスを取得
      const thisMasterKeyIndex = userMasterKeys.findIndex(
        (data) => data.timestamp === thisMasterKeyTimeString,
      )
      //一つ次に新しいmasterKeyを取得
      const nextMasterKey = userMasterKeys[thisMasterKeyIndex - 1]
      if (nextMasterKey) {
        const nextMasterKeyTime = new Date(nextMasterKey.timestamp)
        const identityKeyTime = keys.keys[0].timestamp
        if (nextMasterKeyTime < identityKeyTime) {
          alert("エラーが発生しました")
          return
        }
      }
      if (
        !isValidIdentityKeySign(
          userMasterKey,
          keys.keys[0].identityKey,
        )
      ) {
        alert("エラーが発生しました")
        return
      }
      if (
        !isValidAccountKey(
          keys.keys[0].identityKey,
          keys.keys[0].accountKey,
        )
      ) {
        alert("エラーが発生しました")
        return
      }
      const roomKey = await createRoomKey(
        latestIdentityAndAccountKeys.identityKey,
      )
      const encryptedRoomKey = await encryptWithAccountKey(
        keys.keys[0].accountKey,
        JSON.stringify(roomKey),
      )
      const encryptedRoomKeyForMe = await encryptWithAccountKey(
        state.IdentityKeyAndAccountKeys.value[0].accountKey
          .public,
        JSON.stringify(roomKey),
      )
      const res = await fetch(
        "/takos/v2/client/talk/data/friend/updateRoomKey",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            friendId: userName,
            roomKeys: [{
              userId: userName,
              key: encryptedRoomKey,
            }, {
              userId: state.userId.value,
              key: encryptedRoomKeyForMe,
            }],
            keyHashHex: roomKey.hashHex,
          }),
        },
      )
      const data = await res.json()
      if (data.status === false) {
        alert("エラーが発生しました")
      }
      state.friendKeyCache.roomKey.value.push(
        {
          userId: userName,
          roomid: roomID,
          roomKey,
        },
      )
      return
    }
    const resultRoomKeyArray = await Promise.all(
      roomKeys.map(async (key) => {
        const hashHex = await generateKeyHashHexJWK(key.roomKey)
        return hashHex === key.roomKey.hashHex ? { key, hashHex } : null
      }),
    ).then((results) => results.filter(Boolean)) // Filter out null results

    // Update friendKeyCache
    state.friendKeyCache.roomKey.value = [
      ...state.friendKeyCache.roomKey.value,
      ...roomKeys,
    ]
    console.log(talkData)
    // Process messages
    const messages = []
    for (const message of talkData.messages) {
      const roomKey = resultRoomKeyArray.find(
        (key) => key && String(message.message.value.data.encryptedKeyHashHex) === key.hashHex,
      )?.key
      if (!roomKey) {
        continue
      }
      const decryptedMessage = await decryptDataRoomKey(
        roomKey.roomKey,
        message.message.value.data,
      )
      if (!decryptedMessage) continue
      const messageObj = JSON.parse(decryptedMessage)
      const userIdentityKey = talkData.identityKeys[message.userId]
      if (!userIdentityKey) continue
      let identityKey
      for (const key of userIdentityKey) {
        if (await generateKeyHashHexJWK(key) === message.message.signature.hashedPublicKeyHex) {
          identityKey = key
        }
      }
      if (!identityKey) {
        console.error("Identity key not found")
        continue
      }
      // Verify identity key
      // 0: not verified and not view.
      // 1: not verified and view.
      // 2: verified and view.
      // 3: verified and view and safe.
      const masterKey = await findMasterKey(
        talkData.masterKey,
        identityKey.sign.hashedPublicKeyHex,
      )
      if (!masterKey) {
        console.error("Master key not found")
        continue
      }
      const verifyResult = await (async () => {
        const db = await createTakosDB()
        const allowKeys = await db.get("allowKeys", identityKey.sign.hashedPublicKeyHex)
        if (allowKeys) {
          if (masterKey) {
            const verify = await isValidIdentityKeySign(masterKey.masterKey, identityKey)
            const verifyMessage = await verifyData(
              identityKey,
              JSON.stringify(message.message.value),
              message.message.signature,
            )
            if (verify && verifyMessage) {
              if (allowKeys.type === "allow") return 3
              return 2
            } else {
              return 0
            }
          } else {
            console.log("verifyMessage")
            return 0
          }
        } else {
          const verifyMasterKeyValid = await isValidMasterKeyTimeStamp(masterKey.masterKey)
          const verifyIdentityKeyValid = await isValidIdentityKeySign(
            masterKey.masterKey,
            identityKey,
          )
          if (verifyMasterKeyValid && verifyIdentityKeyValid) {
            const verifyMessage = await verifyData(
              identityKey,
              JSON.stringify(message.message.value),
              message.message.signature,
            )
            if (!verifyMessage) return 0
            await saveToDbAllowKeys(
              await generateKeyHashHexJWK(masterKey.masterKey),
              state.userName.value,
              "recognition",
              masterKey.masterKey.timestamp,
            )
            return 2
          } else {
            return 0
          }
        }
      })()
      if (verifyResult === 0) {
        continue
      }
      if (new Date(message.timestamp) < new Date(messageObj.timestamp)) {
        continue
      }
      if (
        new Date(message.timestamp).getTime() - new Date(messageObj.timestamp).getTime() > 1000 * 60
      ) {
        continue
      }
      messages.push({
        messageid: message.messageid,
        userId: message.userId,
        message: messageObj.message,
        timestamp: message.timestamp,
        timestampOriginal: messageObj.timestamp,
        type: messageObj.type,
        verify: verifyResult,
        identityKeyHashHex: await generateKeyHashHexJWK(identityKey),
        masterKeyHashHex: await generateKeyHashHexJWK(masterKey.masterKey),
      })
    }
    //古いmasterKeyで署名されたidentityKeyで署名する場合は新しいmasterKeyのtimestampの時刻以降のtailDataのみ検証することができる。
    //一度使われたidentityKeyは連続してのみ使用できる。
    //timestampとtimestampOriginalは一意である。
    const messageMasterKeyTimestamp: {
      hashHex: string
      timestamp: string
      userId: string
    }[] = []
    for (const [_index, message] of messages.entries()) {
      if (messageMasterKeyTimestamp.find((key) => key.hashHex === message.masterKeyHashHex)) {
        continue
      }
      messageMasterKeyTimestamp.push({
        hashHex: message.masterKeyHashHex,
        timestamp: message.timestamp,
        userId: message.userId,
      })
    }
    messageMasterKeyTimestamp.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    for (const message of messages) {
      const hashHex = message.masterKeyHashHex
      const timestamp = message.timestamp
      const index = messageMasterKeyTimestamp.findIndex((key) => key.hashHex === hashHex)
      const masterKeyInfo = messageMasterKeyTimestamp[index]
      if (!masterKeyInfo) {
        return
      }
      if (index === 0) {
        continue
      }
      //userIdが同じ場合でindexよりも新しいtimestampを取得
      const newTimestamp = messageMasterKeyTimestamp.find((key) =>
        key.userId === message.userId &&
        new Date(key.timestamp).getTime() > new Date(timestamp).getTime()
      )
      if (newTimestamp) {
        continue
      }
      //timestampが新しいmasterKeyよりも新しいtimestampのmessageは無効
      if (new Date(masterKeyInfo.timestamp).getTime() > new Date(timestamp).getTime()) {
        return
      }
    }
    state.talkData.value = messages.filter(Boolean)
    const roomKeyCache = [...state.friendKeyCache.roomKey.value]
    //console.log(roomKeys)
    for (const key of roomKeys) {
      if (roomKeyCache.find((data) => data.roomKey.hashHex === key.roomKey.hashHex)) {
        continue
      }
      roomKeyCache.push(key)
    }

    state.friendKeyCache.roomKey.value = roomKeyCache
    const friendMasterKeyCache = [...state.friendKeyCache.masterKey.value]
    for (const key of talkData.masterKey) {
      const hashHex = await generateKeyHashHexJWK(key.masterKey)
      if (friendMasterKeyCache.find((data) => data.hashHex === hashHex)) {
        continue
      }
      friendMasterKeyCache.push({
        hashHex,
        masterKey: key.masterKey,
      })
    }
    state.friendKeyCache.masterKey.value = friendMasterKeyCache
    const friendIdentityKeyCache = [...state.friendKeyCache.identityKey.value]
    for (const key in talkData.identityKeys) {
      for (const identityKey of talkData.identityKeys[key]) {
        const hashHex = await generateKeyHashHexJWK(identityKey)
        if (friendIdentityKeyCache.find((data) => data.hashHex === hashHex)) {
          continue
        }
        friendIdentityKeyCache.push({
          userId: key,
          hashHex,
          identityKey,
        })
      }
    }
    state.friendKeyCache.identityKey.value = friendIdentityKeyCache
    state.ws.value?.send(
      JSON.stringify({
        type: "joinFriend",
        sessionid: state.sessionid.value,
        friendid: userName,
      }),
    )
  }

  // Helper function to find identity key by hash
  function findIdentityKey(identityKeys: IdentityKeyPub[], hashHex: string) {
    return identityKeys.find(async (key) => await generateKeyHashHexJWK(key) === hashHex)
  }
  async function findMasterKey(masterKeys: {
    masterKey: MasterKeyPub
    hashHex: string
  }[], hashHex: string) {
    const reuslt = masterKeys.find(
      (key) => key.hashHex === hashHex,
    )
    if (!reuslt) {
      return null
    }
    if (hashHex === await generateKeyHashHexJWK(reuslt.masterKey)) {
      return reuslt
    }
    return null
  }
  if (state.page.value === 0) {
    return (
      <>
        <div class="flex items-center justify-between p-4">
          <div class="text-xs">
          </div>
          <div class="flex items-center space-x-4">
            <span class="material-icons">X</span>
            <span class="material-icons">X</span>
            <span class="material-icons">X</span>
          </div>
        </div>

        <div class="p-4">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center">
              <img
                src="/api/v2/client/users/icon"
                alt="Profile"
                class="rounded-full"
              />
            </div>
            <div>
              <h1 class="text-2xl font-bold">たこ</h1>
              <p class="text-sm">I'm full stack engineer</p>
              <p class="text-sm text-green-400">tako@localhost:8000</p>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div class="mb-4">
            <input
              type="text"
              placeholder="検索"
              class="w-full p-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <h2 class="text-xl font-bold mb-2">友だちリスト</h2>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt="kuma"
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">誕生日が近い友だち</p>
                  <p class="text-xs text-gray-400">kuma</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt=""
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">お気に入り</p>
                  <p class="text-xs text-gray-400">いか</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt=""
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">友だち</p>
                  <p class="text-xs text-gray-400">たこ、かに、魚</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt="グループ"
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">グループ</p>
                  <p class="text-xs text-gray-400">魚介類同好会</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  } else if (state.page.value === 1) {
    return (
      <>
        {state.friendList.value.length === 0 &&
          (
            <>
              <User
                userName="友達がいません"
                latestMessage="友達を追加しましょう！"
                icon="/people.png"
                isNewMessage={false}
                isSelected={false}
                onClick={() => {
                  state.page.value = 2
                }}
              />
            </>
          )}
        {state.friendList.value.map((talk: any) => {
          console.log(talk.type)
          if (talk.type === "group") {
            return (
              <User
                userName={talk.roomName}
                latestMessage={talk.latestMessage}
                icon={talk.icon}
                userName2={talk.userName}
                isNewMessage={talk.isNewMessage}
                isSelected={talk.isSelect}
                onClick={() => {
                  state.ws.value?.send(
                    JSON.stringify({
                      type: "joinRoom",
                      sessionid: state.sessionid.value,
                      roomid: talk.roomID,
                    }),
                  )
                }}
              />
            )
          } else if (talk.type === "friend") {
            return (
              <User
                userName={talk.nickName}
                latestMessage={talk.latestMessage
                  ? talk.latestMessage.message
                  : "トーク履歴がありません"}
                icon={"/takos/v2/client/users/icon/friend?userName=" +
                  talk.userName}
                userName2={talk.userName}
                isNewMessage={talk.isNewMessage ? talk.isNewMessage : false}
                isSelected={talk.isSelect}
                onClick={async () => {
                  handleFriendRoomSetup(talk)
                }}
              />
            )
          }
        })}
      </>
    )
  } else if (state.page.value === 2) {
    return (
      <>
        <FriendRequest
          state={state}
        >
        </FriendRequest>
        <h1 class="text-lg">友達を追加</h1>
        <RequestFriendById />
        <User
          userName="QRコードで追加"
          latestMessage=""
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
        />
        <GetAddFriendKey />
      </>
    )
  } else if (state.page.value === 3) {
    const settingPage = useSignal(0)
    return (
      <>
        <h1 class="text-lg">設定</h1>
        <User
          userName="プロフィール"
          latestMessage="プロフィールを編集します"
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={() => {
            settingPage.value = 1
          }}
        />
        <User
          userName="その他"
          latestMessage=""
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={() => {
            settingPage.value = 2
          }}
        />
        <User
          userName="ログアウト"
          latestMessage="ログアウトします"
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={async () => {
            const res = await fetch("/takos/v2/client/sessions/logout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            })
            const json = await res.json()
            if (json.status === true) {
              const db = await createTakosDB()
              await db.clear("deviceKey")
              await db.clear("keyShareKeys")
              await db.clear("masterKey")
              await db.clear("config")
              await db.clear("allowKeys")
              await db.clear("identityAndAccountKeys")
              window.location.href = "/"
            }
            //indexedDBから削除
          }}
        />
        {settingPage.value === 2 && <OtherSettingPage settingPage={settingPage} />}
        {settingPage.value === 1 && (
          <>
            <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
              <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
                <div class="absolute right-0 top-0 p-4">
                  <span
                    class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                    onClick={() => {
                      settingPage.value = 0
                    }}
                  >
                    ×
                  </span>
                </div>
                <form
                  class="w-4/5 mx-auto my-auto mt-10"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const inputFormData = new FormData(
                      e.target as HTMLFormElement,
                    )
                    const nickName = inputFormData.get("nickName") as string
                    const icon = inputFormData.get("icon") as File
                    if (nickName === "" && icon.name === "") {
                      alert("いずれかの項目を入力してください")
                      return
                    }
                    const info = {
                      nickName: false,
                      icon: false,
                    }
                    if (nickName !== "") {
                      const csrftokenReq = await fetch(
                        "/api/v2/client/csrftoken",
                        {
                          method: "GET",
                        },
                      )
                      const csrftoken = await csrftokenReq.json()
                      const res = await fetch(
                        "/api/v2/client/settings/nickname",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            nickName: nickName,
                            csrftoken: csrftoken.csrftoken,
                          }),
                        },
                      )
                      const result = await res.json()
                      console.log(result)
                      if (result.status === true) {
                        info.nickName = true
                      }
                    }
                    if (icon.name !== "") {
                      const csrftokenReq = await fetch(
                        "/api/v2/client/csrftoken",
                        {
                          method: "GET",
                        },
                      )
                      const csrftoken = await csrftokenReq.json()
                      const formData = new FormData()
                      formData.append("icon", icon)
                      formData.append("csrftoken", csrftoken.csrftoken)
                      const res = await fetch("/api/v2/client/settings/icon", {
                        method: "POST",
                        body: formData,
                      })
                      const result = await res.json()
                      if (result.status === true) {
                        info.icon = true
                      }
                    }
                    if (icon.name !== "" && nickName !== "") {
                      if (info.nickName === true && info.icon === true) {
                        alert("保存しました")
                        settingPage.value = 0
                        //リロード
                        window.location.href = "/setting"
                      }
                      if (info.nickName === false && info.icon === true) {
                        alert("ニックネームの保存に失敗しました")
                      }
                      if (info.nickName === true && info.icon === false) {
                        alert("アイコンの保存に失敗しました")
                      }
                      if (info.nickName === false && info.icon === false) {
                        alert("保存に失敗しました")
                      }
                    }
                  }}
                >
                  <div class="text-center text-sm">
                    <p class="text-black dark:text-white hover:underline font-medium text-3xl mt-4 mb-5">
                      プロフィールの設定
                    </p>
                  </div>
                  <div>
                    <div class="lg:w-1/2 m-auto text-black dark:text-white lg:flex">
                      <img
                        src="/api/v2/client/users/icon"
                        alt=""
                        class="rounded-full lg:w-1/3 w-2/3 m-auto max-w-xs"
                      />
                      <div class="m-auto">
                        <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 dark:text-white">
                            ニックネーム
                          </label>
                          <input
                            type="text"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="ニックネームを入力してください"
                            name="nickName"
                            multiple
                          />
                        </div>
                        <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 dark:text-white">
                            アイコン
                          </label>
                          <input
                            type="file"
                            class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            accept="image/*"
                            name="icon"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="text-center">
                    <button
                      class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                      type="submit"
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </>
    )
  }
  return <></>
}
function OtherSettingPage({ settingPage }: { settingPage: any }) {
  const addFriendById = useSignal(false)
  const allowOtherServerUsers = useSignal(false)
  useEffect(() => {
    async function run() {
      const res = await fetch("/api/v2/client/users/settings")
      const json = await res.json()
      addFriendById.value = json.settings.addFriendById
      allowOtherServerUsers.value = json.settings.allowOtherServerUsers
    }
    run()
  }, [])
  return (
    <>
      <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
        <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
          <div class="absolute right-0 top-0 p-4">
            <span
              class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
              onClick={() => {
                settingPage.value = 0
              }}
            >
              ×
            </span>
          </div>
          <div class="w-4/5 mx-auto my-auto mt-10 h-full space-y-8 text-center">
            <h1 class="text-center text-2xl text-black dark:text-white hover:underline font-medium">
              その他の設定
            </h1>
            <div class="mt-12">
              <div class="flex mx-auto lg:w-2/3 w-full mb-4">
                <div class="ml-0 w-1/2">
                  <p class="text-center">他のサーバーのユーザーを許可</p>
                </div>
                <div class="w-1/2 flex">
                  <label class="inline-flex items-center cursor-pointer mx-auto">
                    <input
                      type="checkbox"
                      checked={addFriendById.value}
                      class="sr-only peer"
                      onChange={() => {
                        addFriendById.value = !addFriendById.value
                      }}
                    />
                    <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                  </label>
                </div>
              </div>
              <div class="flex mx-auto lg:w-2/3 w-full">
                <div class="ml-0 w-1/2">
                  <p class="text-center">idによる追加を許可</p>
                </div>
                <div class="w-1/2 flex">
                  <label class="inline-flex items-center cursor-pointer mx-auto">
                    <input
                      type="checkbox"
                      checked={allowOtherServerUsers.value}
                      class="sr-only peer"
                      onChange={() => {
                        allowOtherServerUsers.value = !allowOtherServerUsers
                          .value
                      }}
                    />
                    <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="flex">
              <button
                type="submit"
                class="rounded-lg mx-auto text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                onClick={async () => {
                  const csrftokenRes = await fetch("/api/v2/client/csrftoken")
                  const csrftokenJson = await csrftokenRes.json()
                  const csrftoken = csrftokenJson.csrftoken
                  const res = await fetch("/api/v2/client/settings/privacy", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      setting: {
                        addFriendById: addFriendById.value,
                        allowOtherServerUsers: allowOtherServerUsers.value,
                      },
                      csrftoken: csrftoken,
                    }),
                  })
                  const json = await res.json()
                  if (!json.status) {
                    alert("エラーが発生しました")
                    return
                  }
                  alert("保存しました")
                }}
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default TalkListContent
