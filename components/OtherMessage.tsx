const ChatOtherMessage = ({ name, time, message, isPrimary, nickName }: any) => {
  const isPrimaryClass = isPrimary ? "c-talk-chat other primary" : "c-talk-chat other subsequent";
  return (
    <li class={isPrimaryClass}>
      <div class="c-talk-chat-box mb-1">
        {isPrimary && (
          <div class="c-talk-chat-icon">
            <img
              src={`/api/v2/client/friends/info/${name}/icon/friend`}
              alt=""
              class="rounded-full text-white dark:text-black"
            />
          </div>
        )}
        <div class="c-talk-chat-right">
          {isPrimary && (
            <div class="c-talk-chat-name">
              <p>{nickName}</p>
            </div>
          )}
          <div class="c-talk-chat-msg">
            <p>
              {convertLineBreak(message)}
            </p>
          </div>
        </div>
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
        </div>
      </div>
    </li>
  );
};
//preactで動作する改行を反映させるために、改行コードをbrタグに変換する関数
function convertLineBreak(message: string | null | undefined) {
  if (message === null || message === undefined) return;
  return message.split("\n").map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ));
}
//Date型のデータを受け取り、午前か午後何時何分かを返す関数
function convertTime(time: string | number | Date) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "午後" : "午前";
  const hour = hours % 12;
  const zeroPaddingHour = hour === 0 ? 12 : hour;
  const zeroPaddingMinutes = String(minutes).padStart(2, "0");
  return `${ampm} ${zeroPaddingHour}:${zeroPaddingMinutes}`;
}
export default ChatOtherMessage;
